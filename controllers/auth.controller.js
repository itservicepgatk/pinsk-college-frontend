const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { supabase } = require('../supabase');
const { logAction } = require('../services/audit.service.js');
const { sendTelegramNotification } = require('../services/notification.service.js');
const JWT_SECRET = process.env.JWT_SECRET || 'your_default_super_secret_key';

const getSettingValue = async (key, defaultValue = 'false') => {
    try {
        const result = await pool.query("SELECT value FROM settings WHERE key = $1", [key]);
        return result.rows.length > 0 ? result.rows[0].value : defaultValue;
    } catch (e) {
        return defaultValue;
    }
};

async function fetchFilesRecursively(bucket, path, displayPrefix = '') {
    const { data, error } = await supabase.storage.from(bucket).list(path);
    if (error) return [];
    if (!data) return [];
    let results = [];
    for (const item of data) {
        const isFolder = !item.metadata || !item.metadata.mimetype; 
        if (item.name === '.emptyFolderPlaceholder') continue;
        if (isFolder) {
            const subFiles = await fetchFilesRecursively(bucket, `${path}/${item.name}`, displayPrefix);
            results.push(...subFiles);
        } else {
            results.push({
                name: `${displayPrefix}${item.name}`,
                path: `${path}/${item.name}`,
            });
        }
    }
    return results;
}

const loginLearner = async (req, res) => {
    const { login, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',').shift() || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    try {
        const result = await pool.query('SELECT * FROM learners WHERE login = $1 AND deleted_at IS NULL', [login]);
        const learner = result.rows[0];
        if (!learner) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        const isPasswordCorrect = await bcrypt.compare(password, learner.password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Неверный пароль' });
        }
        await pool.query('UPDATE user_sessions SET is_active = false, logout_time = NOW() WHERE user_id = $1 AND user_type = \'learner\' AND is_active = true', [learner.id]);
        await pool.query(
            'INSERT INTO user_sessions (user_id, user_type, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [learner.id, 'learner', ipAddress, userAgent]
        );
        const token = jwt.sign({ learnerId: learner.id, group: learner.group_name }, JWT_SECRET, {
            expiresIn: '8h',
        });
        
        let materials = [];
        const groupFolderPath = `dlya-${learner.group_name}-gruppy`;
        const sharedFolderPath = 'shared-materials';
        const [groupMaterials, sharedMaterials] = await Promise.all([
            fetchFilesRecursively('materials', groupFolderPath),
            fetchFilesRecursively('materials', sharedFolderPath, '(Общий) ')
        ]);
        materials.push(...groupMaterials);
        materials.push(...sharedMaterials);

        const rawDebts = learner.academic_debts || '';
        const isDebtor = rawDebts.trim() !== '' &&
                         rawDebts.toLowerCase() !== 'нет' &&
                         rawDebts.toLowerCase() !== 'отсутствуют';

        const announcementsResult = await pool.query(
            `SELECT title, content, created_at, type, file_url, is_pinned, publish_at
             FROM announcements 
             WHERE publish_at <= NOW()
               AND deleted_at IS NULL
               AND (
                 type = 'global' 
                 OR target_group = $1
                 OR (type = 'debtors' AND $2 = true)
               )
             ORDER BY is_pinned DESC, publish_at DESC`,
            [learner.group_name, isDebtor]
        );
        const learnerData = {
            fullName: learner.full_name,
            course: learner.course,
            group: learner.group_name,
            specialty: learner.specialty,
            studentCode: learner.student_code,
            sessionSchedule: learner.session_schedule,
            academicDebts: learner.academic_debts,
            materials: materials,
            announcements: announcementsResult.rows,
        };
        const maintenanceMode = (await getSettingValue('maintenance_mode', 'false')) === 'true';
        res.status(200).json({ learnerData, token, maintenanceMode });
    } catch (error) {
        console.error('Ошибка при входе учащегося:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
};

const loginAdmin = async (req, res) => {
    const { login, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',').shift() || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    try {
        const result = await pool.query('SELECT * FROM admins WHERE login = $1', [login]);
        const admin = result.rows[0];
        if (!admin) {
            return res.status(404).json({ message: 'Администратор не найден' });
        }
        const isPasswordCorrect = await bcrypt.compare(password, admin.password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Неверный пароль' });
        }

        if (admin.role === 'superadmin') {
            const notifyEnabled = await getSettingValue('admin_login_notifications', 'true');
            if (notifyEnabled === 'true') {
                const timestamp = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Minsk' });
                sendTelegramNotification({
                    login: admin.login,
                    timestamp: timestamp,
                    ipAddress: ipAddress,
                    userAgent: userAgent
                }).catch(console.error);
            }
        }

        await logAction('ADMIN_LOGIN', `Администратор ${admin.login} вошел в систему.`, admin.id, ipAddress);
        await pool.query('UPDATE user_sessions SET is_active = false, logout_time = NOW() WHERE user_id = $1 AND user_type = \'admin\' AND is_active = true', [admin.id]);
        await pool.query(
            'INSERT INTO user_sessions (user_id, user_type, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [admin.id, 'admin', ipAddress, userAgent]
        );
        const token = jwt.sign({ adminId: admin.id, role: admin.role }, JWT_SECRET, {
            expiresIn: '3h',
        });
        const maintenanceMode = (await getSettingValue('maintenance_mode', 'false')) === 'true';
        res.status(200).json({ token, role: admin.role, maintenanceMode });
    } catch (error) {
        console.error('Ошибка при входе администратора:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
};

const loginByQr = async (req, res) => {
    const { key } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',').shift() || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!key) return res.status(400).json({ message: 'Ключ не предоставлен' });

    try {
        // Ищем студента по ключу
        const result = await pool.query('SELECT * FROM learners WHERE qr_key = $1 AND deleted_at IS NULL', [key]);
        const learner = result.rows[0];

        if (!learner) {
            return res.status(404).json({ message: 'Недействительный QR-код' });
        }

        // Логика входа (копия из loginLearner, но без проверки пароля)
        await pool.query('UPDATE user_sessions SET is_active = false, logout_time = NOW() WHERE user_id = $1 AND user_type = \'learner\' AND is_active = true', [learner.id]);
        await pool.query(
            'INSERT INTO user_sessions (user_id, user_type, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [learner.id, 'learner', ipAddress, userAgent]
        );

        const token = jwt.sign({ learnerId: learner.id, group: learner.group_name }, JWT_SECRET, {
            expiresIn: '8h',
        });

        // Загрузка материалов (копия логики)
        let materials = [];
        const groupFolderPath = `dlya-${learner.group_name}-gruppy`;
        const sharedFolderPath = 'shared-materials';
        const [groupMaterials, sharedMaterials] = await Promise.all([
            fetchFilesRecursively('materials', groupFolderPath),
            fetchFilesRecursively('materials', sharedFolderPath, '(Общий) ')
        ]);
        materials.push(...groupMaterials);
        materials.push(...sharedMaterials);

        const rawDebts = learner.academic_debts || '';
        const isDebtor = rawDebts.trim() !== '' && rawDebts.toLowerCase() !== 'нет' && rawDebts.toLowerCase() !== 'отсутствуют';

        const announcementsResult = await pool.query(
            `SELECT title, content, created_at, type, file_url, is_pinned, publish_at
             FROM announcements 
             WHERE publish_at <= NOW()
               AND deleted_at IS NULL
               AND (type = 'global' OR target_group = $1 OR (type = 'debtors' AND $2 = true))
             ORDER BY is_pinned DESC, publish_at DESC`,
            [learner.group_name, isDebtor]
        );

        const learnerData = {
            fullName: learner.full_name,
            course: learner.course,
            group: learner.group_name,
            specialty: learner.specialty,
            studentCode: learner.student_code,
            sessionSchedule: learner.session_schedule,
            academicDebts: learner.academic_debts,
            materials: materials,
            announcements: announcementsResult.rows,
        };

        const maintenanceMode = (await getSettingValue('maintenance_mode', 'false')) === 'true';
        
        // Логируем вход по QR
        await logAction('QR_LOGIN', `Вход по QR-коду: ${learner.login}`, null, ipAddress);

        res.status(200).json({ learnerData, token, maintenanceMode });

    } catch (error) {
        console.error('Ошибка при входе по QR:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
};

module.exports = {
    loginLearner,
    loginAdmin,
    loginByQr,
};