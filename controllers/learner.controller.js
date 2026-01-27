const { sendErrorLogToTelegram } = require('../services/notification.service');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { supabase } = require('../supabase');
const { PDFDocument, rgb, degrees } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const fontkit = require('@pdf-lib/fontkit');
const { logAction } = require('../services/audit.service.js');
const crypto = require('crypto'); // Для генерации QR-ключей

const getWatermarkedMaterial = async (req, res) => {
    const filePath = req.query.path ? decodeURIComponent(req.query.path) : null;
    
    const learnerId = req.learner.learnerId;

    if (!filePath) {
        return res.status(400).json({ message: 'Не указан путь к файлу' });
    }

    try {
        console.log(`[DEBUG] Попытка скачать файл: "${filePath}"`);

        const { data: fileData, error: downloadError } = await supabase.storage
            .from('materials')
            .download(filePath);

        if (downloadError) {
            console.error('Полная ошибка Supabase:', JSON.stringify(downloadError, null, 2));
            throw new Error(`Supabase Error (${downloadError.statusCode || 'Unknown'}): ${JSON.stringify(downloadError)} | Path: ${filePath}`);
        }
        const fileBuffer = Buffer.from(await fileData.arrayBuffer());
        const fileExtension = path.extname(filePath).toLowerCase();
        if (fileExtension === '.pdf') {
            const learnerResult = await pool.query('SELECT full_name FROM learners WHERE id = $1', [learnerId]);
            if (learnerResult.rows.length === 0) {
                return res.status(404).json({ message: 'Учащийся не найден' });
            }
            const watermarkText = learnerResult.rows[0].full_name;
            const pdfDoc = await PDFDocument.load(fileBuffer);
            pdfDoc.registerFontkit(fontkit);
            const fontBytes = fs.readFileSync(path.join(__dirname, '../assets/NotoSans-Regular.ttf'));
            const customFont = await pdfDoc.embedFont(fontBytes);
            const pages = pdfDoc.getPages();
            for (const page of pages) {
                const { width, height } = page.getSize();
                page.drawText(watermarkText, {
                    x: width / 2 - 150,
                    y: height / 2,
                    font: customFont,
                    size: 50,
                    color: rgb(0.5, 0.5, 0.5),
                    opacity: 0.15,
                    rotate: degrees(-45),
                });
            }
            const modifiedPdfBytes = await pdfDoc.save();
            res.setHeader('Content-Type', 'application/pdf');
            res.send(Buffer.from(modifiedPdfBytes));
        }
        else if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(fileExtension)) {
            let contentType = 'application/octet-stream';
            if (fileExtension === '.png') contentType = 'image/png';
            if (fileExtension === '.jpg' || fileExtension === '.jpeg') contentType = 'image/jpeg';
            if (fileExtension === '.gif') contentType = 'image/gif';
            if (fileExtension === '.webp') contentType = 'image/webp';
            res.setHeader('Content-Type', contentType);
            res.send(fileBuffer);
        }
        else {
            res.status(400).json({ message: 'Предварительный просмотр для этого типа файла не поддерживается.' });
        }
} catch (error) {
    console.error('Ошибка при обработке файла:', error);
    sendErrorLogToTelegram(error, 'File Processing Error').catch(console.error);

    res.status(500).json({
        message: 'Не удалось обработать файл на сервере.',
        error: error.message,
    });
}
};

const getMaterialUrl = async (req, res) => {
    const filePath = req.query.path;
    if (!filePath) {
        return res.status(400).json({ message: 'Не указан путь к файлу' });
    }
    try {
        const { data, error } = await supabase.storage.from('materials').createSignedUrl(filePath, 60);
        if (error) {
            console.error('Ошибка генерации подписной ссылки:', error.message);
            return res.status(500).json({ message: 'Не удалось сгенерировать ссылку на файл' });
        }
        res.json({ signedUrl: data.signedUrl });
    } catch (error) {
        console.error('Критическая ошибка при генерации ссылки:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
};

const getAllLearners = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const searchGroup = req.query.searchGroup || '';
    const searchName = req.query.searchName || '';
    let sortBy = req.query.sortBy || 'full_name';
    const sortDir = req.query.sortDir === 'desc' ? 'DESC' : 'ASC';
    const allowedSortBy = ['full_name', 'group_name', 'login'];
    if (!allowedSortBy.includes(sortBy)) {
        sortBy = 'full_name';
    }
    try {
        let queryParams = [];
        let whereClauses = ["deleted_at IS NULL"];
        if (searchGroup) {
            if (searchGroup === 'null') {
                whereClauses.push(`group_name IS NULL`);
            } else {
                queryParams.push(searchGroup);
                whereClauses.push(`group_name = $${queryParams.length}`);
            }
        }
        if (searchName) {
            queryParams.push(`%${searchName}%`);
            whereClauses.push(`full_name ILIKE $${queryParams.length}`);
        }
        const whereClause = `WHERE ${whereClauses.join(' AND ')}`;
        const totalResult = await pool.query(`SELECT COUNT(*) FROM learners ${whereClause}`, queryParams);
        const totalLearners = parseInt(totalResult.rows[0].count);
        const totalPages = Math.ceil(totalLearners / limit);
        queryParams.push(limit);
        queryParams.push(offset);
        
        // Добавили qr_key в выборку
        const learnersResult = await pool.query(
            `SELECT id, full_name, login, group_name, course, specialty, enrollment_date, session_schedule, academic_debts, qr_key 
             FROM learners ${whereClause} 
             ORDER BY ${sortBy} ${sortDir} 
             LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
            queryParams
        );
        res.json({
            learners: learnersResult.rows,
            totalPages: totalPages,
            currentPage: page,
        });
    } catch (error) {
        console.error('Ошибка при получении данных учащихся:', error);
        res.status(500).json({ message: 'Ошибка при получении данных учащихся' });
    }
};

const createLearner = async (req, res) => {
    const {
        login,
        password,
        fullName,
        course,
        group_name,
        specialty,
        enrollmentDate,
        sessionSchedule,
        academicDebts,
    } = req.body;
    try {
        const password_hash = await bcrypt.hash(password, 10);
        // Генерируем QR ключ при создании
        const qrKey = crypto.randomBytes(16).toString('hex');

        const result = await pool.query(
            `INSERT INTO learners (login, password_hash, full_name, course, group_name, specialty, enrollment_date, session_schedule, academic_debts, qr_key)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                login,
                password_hash,
                fullName,
                course,
                group_name,
                specialty,
                enrollmentDate,
                sessionSchedule,
                academicDebts,
                qrKey
            ]
        );
        const newLearner = result.rows[0];
        await logAction('CREATE_LEARNER', `Создан новый учащийся: ${newLearner.full_name} (Группа: ${newLearner.group_name})`, req.admin.adminId);
        res.status(201).json(newLearner);
    } catch (error) {
        console.error('Ошибка при добавлении учащегося:', error);
        res.status(500).json({ message: 'Ошибка при добавлении учащегося' });
    }
};

const updateLearner = async (req, res) => {
    const { id } = req.params;
    const {
        password,
        fullName,
        course,
        group_name,
        specialty,
        enrollmentDate,
        sessionSchedule,
        academicDebts,
    } = req.body;
    try {
        let query =
            'UPDATE learners SET full_name = $1, course = $2, group_name = $3, specialty = $4, enrollment_date = $5, session_schedule = $6, academic_debts = $7';
        let queryParams = [
            fullName,
            course,
            group_name,
            specialty,
            enrollmentDate,
            sessionSchedule,
            academicDebts,
        ];
        if (password) {
            const password_hash = await bcrypt.hash(password, 10);
            query += `, password_hash = $${queryParams.length + 1}`;
            queryParams.push(password_hash);
            
            // Если меняем пароль, меняем и QR ключ для безопасности
            const newQrKey = crypto.randomBytes(16).toString('hex');
            query += `, qr_key = $${queryParams.length + 1}`;
            queryParams.push(newQrKey);
        }
        query += ` WHERE id = $${queryParams.length + 1} RETURNING *`;
        queryParams.push(id);
        const result = await pool.query(query, queryParams);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Учащийся с таким ID не найден' });
        }
        const updatedLearner = result.rows[0];
        await logAction('UPDATE_LEARNER', `Обновлены данные учащегося: ${updatedLearner.full_name} (ID: ${id})`, req.admin.adminId);
        res.json(updatedLearner);
    } catch (error) {
        console.error('Ошибка при обновлении данных учащегося:', error);
        res.status(500).json({ message: 'Ошибка при обновлении данных учащегося' });
    }
};

const updateGroup = async (req, res) => {
    const { group_name, new_group_name, updates } = req.body;
    if (!group_name) {
        return res.status(400).json({ message: 'Не указана целевая группа.' });
    }
    try {
        let affectedRows = 0;
        const logDetails = [];
        let currentGroupName = group_name;
        if (new_group_name && new_group_name !== group_name) {
            const renameResult = await pool.query(
                'UPDATE learners SET group_name = $1 WHERE group_name = $2 AND deleted_at IS NULL',
                [new_group_name, group_name]
            );
            affectedRows = renameResult.rowCount;
            logDetails.push(`переименована в '${new_group_name}'`);
            currentGroupName = new_group_name;
        }
        if (updates && Object.keys(updates).length > 0) {
            let setClauses = [];
            let queryParams = [];
            let paramIndex = 1;
            const allowedUpdates = ['course', 'specialty', 'session_schedule', 'academic_debts'];
            for (const key in updates) {
                if (allowedUpdates.includes(key) && updates[key] !== undefined) {
                    setClauses.push(`${key} = $${paramIndex++}`);
                    queryParams.push(updates[key]);
                    logDetails.push(`${key} изменен(а) на '${updates[key]}'`);
                }
            }
            if (setClauses.length > 0) {
                queryParams.push(currentGroupName);
                const query = `UPDATE learners SET ${setClauses.join(', ')} WHERE group_name = $${paramIndex} AND deleted_at IS NULL`;
                const updateResult = await pool.query(query, queryParams);
                if (affectedRows === 0) {
                    affectedRows = updateResult.rowCount;
                }
            }
        }
        if (logDetails.length > 0) {
            const logMessage = `Группа '${group_name}' была изменена: ${logDetails.join(', ')}. Затронуто учащихся: ${affectedRows}.`;
            await logAction('UPDATE_GROUP', logMessage, req.admin.adminId);
            res.json({
                message: `Изменения для группы ${group_name} успешно применены. Затронуто учащихся: ${affectedRows}`,
            });
        } else {
            res.status(400).json({ message: 'Не передано данных для обновления.' });
        }
    } catch (error) {
        console.error('Ошибка при массовом обновлении группы:', error);
        res.status(500).json({ message: 'Ошибка при массовом обновлении группы' });
    }
};

const deleteLearner = async (req, res) => {
    const { id } = req.params;
    try {
        const learnerToDelete = await pool.query('SELECT full_name FROM learners WHERE id = $1', [id]);
        const learnerName = learnerToDelete.rows.length > 0 ? learnerToDelete.rows[0].full_name : `ID: ${id}`;
        await pool.query('UPDATE learners SET deleted_at = NOW() WHERE id = $1', [id]);
        await logAction('SOFT_DELETE_LEARNER', `Учащийся перемещен в корзину: ${learnerName}`, req.admin.adminId);
        res.status(200).json({ message: 'Учащийся успешно перемещен в корзину' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении учащегося' });
    }
};

const deleteMultipleLearners = async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Не предоставлены ID учащихся для удаления.' });
    }
    try {
        const result = await pool.query('UPDATE learners SET deleted_at = NOW() WHERE id = ANY($1::int[])', [ids]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ни один из указанных учащихся не был найден.' });
        }
        await logAction('SOFT_DELETE_MULTIPLE_LEARNERS', `Массово перемещено в корзину ${result.rowCount} учащихся`, req.admin.adminId);
        res.status(200).json({ message: `Успешно перемещено в корзину учащихся: ${result.rowCount}` });
    } catch (error) {
        console.error('Ошибка при массовом удалении учащихся:', error);
        res.status(500).json({ message: 'Ошибка при массовом удалении учащихся' });
    }
};

const deleteGroup = async (req, res) => {
    const { group_name } = req.params;
    if (!group_name) {
        return res.status(400).json({ message: 'Не указано имя группы.' });
    }
    try {
        let result;
        if (group_name === 'null') {
            result = await pool.query('UPDATE learners SET deleted_at = NOW() WHERE group_name IS NULL');
        } else {
            result = await pool.query('UPDATE learners SET deleted_at = NOW() WHERE group_name = $1', [group_name]);
        }
        await logAction('SOFT_DELETE_GROUP', `Группа ${group_name} перемещена в корзину. Затронуто: ${result.rowCount} учащихся.`, req.admin.adminId);
        res.status(200).json({ message: `Группа ${group_name} и все ее учащиеся (${result.rowCount}) успешно перемещены в корзину.` });
    } catch (error) {
        console.error(`Ошибка при перемещении группы ${group_name} в корзину:`, error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при удалении группы.' });
    }
};

const exportLearners = async (req, res) => {
    try {
        const result = await pool.query('SELECT full_name, login, group_name, course, specialty, enrollment_date, session_schedule, academic_debts FROM learners WHERE deleted_at IS NULL ORDER BY group_name, full_name');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при экспорте учащихся:', error);
        res.status(500).json({ message: 'Не удалось экспортировать данные учащихся' });
    }
};

const importLearners = async (req, res) => {
    const learners = req.body.learners;
    if (!learners || !Array.isArray(learners) || learners.length === 0) {
        return res.status(400).json({ message: 'Не предоставлены данные для импорта.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const learner of learners) {
            if (!learner.login || !learner.password || !learner.fullName || !learner.group_name) {
                throw new Error(`Недостаточно данных для учащегося: ${learner.fullName || learner.login}`);
            }
            const password_hash = await bcrypt.hash(learner.password, 10);
            const qrKey = crypto.randomBytes(16).toString('hex');

            await client.query(
                `INSERT INTO learners (login, password_hash, full_name, group_name, course, specialty, enrollment_date, session_schedule, academic_debts, qr_key)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    learner.login,
                    password_hash,
                    learner.fullName,
                    learner.group_name,
                    learner.course || null,
                    learner.specialty || null,
                    learner.enrollmentDate || null,
                    learner.sessionSchedule || null,
                    learner.academicDebts || null,
                    qrKey
                ]
            );
        }
        await client.query('COMMIT');
        await logAction('IMPORT_LEARNERS', `Массово импортировано ${learners.length} учащихся.`, req.admin.adminId);
        res.status(201).json({ message: `Успешно импортировано ${learners.length} учащихся.` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка при импорте учащихся:', error);
        res.status(500).json({ message: `Ошибка при импорте: ${error.message}` });
    } finally {
        client.release();
    }
};

const logLearnerLogout = async (req, res) => {
    try {
        await pool.query(
            'UPDATE user_sessions SET is_active = false, logout_time = NOW() WHERE user_id = $1 AND user_type = \'learner\' AND is_active = true',
            [req.learner.learnerId]
        );
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Ошибка при логировании выхода учащегося:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const recordLearnerActivity = async (req, res) => {
    try {
        await pool.query(
            'UPDATE user_sessions SET last_activity = NOW() WHERE user_id = $1 AND user_type = \'learner\' AND is_active = true',
            [req.learner.learnerId]
        );
        res.status(200).json({ message: 'Activity recorded' });
    } catch (error) {
        console.error('Ошибка при записи активности учащегося:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getDebtors = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, full_name, group_name, specialty, academic_debts
            FROM learners
            WHERE academic_debts IS NOT NULL 
              AND academic_debts != '' 
              AND lower(academic_debts) != 'нет' 
              AND lower(academic_debts) != 'отсутствуют'
              AND deleted_at IS NULL
            ORDER BY group_name, full_name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении списка должников:', error);
        res.status(500).json({ message: 'Не удалось получить список должников' });
    }
};

const generatePassword = (length = 8) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

const resetGroupPasswords = async (req, res) => {
    const { group_name } = req.body;
    if (!group_name) {
        return res.status(400).json({ message: 'Необходимо указать группу.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const learnersResult = await client.query('SELECT id, login FROM learners WHERE group_name = $1 AND deleted_at IS NULL', [group_name]);
        const learners = learnersResult.rows;
        if (learners.length === 0) {
            return res.status(404).json({ message: 'В данной группе нет учащихся.' });
        }
        const newCredentials = [];
        for (const learner of learners) {
            const newPassword = generatePassword();
            const password_hash = await bcrypt.hash(newPassword, 10);
            const newQrKey = crypto.randomBytes(16).toString('hex');

            await client.query('UPDATE learners SET password_hash = $1, qr_key = $2 WHERE id = $3', [password_hash, newQrKey, learner.id]);
            newCredentials.push({ login: learner.login, password: newPassword });
        }
        await client.query('COMMIT');
        const csvHeader = 'login,new_password\n';
        const csvBody = newCredentials.map(c => `${c.login},${c.password}`).join('\n');
        const csvContent = csvHeader + csvBody;
        await logAction('RESET_PASSWORDS', `Сброшены пароли для группы ${group_name}. Затронуто учащихся: ${learners.length}.`, req.admin.adminId);
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', `attachment; filename="new_passwords_${group_name}.csv"`);
        res.status(200).send(csvContent);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка при массовом сбросе паролей:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при сбросе паролей.' });
    } finally {
        client.release();
    }
};

const getLearnerProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const learnerResult = await pool.query('SELECT * FROM learners WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (learnerResult.rowCount === 0) {
            return res.status(404).json({ message: 'Учащийся не найден' });
        }
        const learner = learnerResult.rows[0];
        const [sessionsResult, auditResult] = await Promise.all([
            pool.query(
                "SELECT * FROM user_sessions WHERE user_id = $1 AND user_type = 'learner' ORDER BY login_time DESC",
                [id]
            ),
            pool.query(
                `SELECT al.*, a.login as admin_login 
                 FROM audit_log al 
                 LEFT JOIN admins a ON al.admin_id = a.id
                 WHERE al.details ILIKE $1 OR al.details ILIKE $2
                 ORDER BY al.timestamp DESC`,
                [`%${learner.full_name}%`, `% (ID: ${id})%`]
            )
        ]);
        res.json({
            learner: learner,
            sessions: sessionsResult.rows,
            audit: auditResult.rows
        });
    } catch (error) {
        console.error(`Ошибка при получении профиля учащегося (ID: ${id}):`, error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
};

const resetPasswordsForList = async (req, res) => {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Не выбраны учащиеся.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const updatedLearners = [];
        
        for (const id of ids) {
            const newPassword = Math.random().toString(36).slice(-8);
            const password_hash = await bcrypt.hash(newPassword, 10);
            const newQrKey = crypto.randomBytes(16).toString('hex');
            
            const result = await client.query(
                'UPDATE learners SET password_hash = $1, qr_key = $2 WHERE id = $3 RETURNING id, full_name, login, group_name, qr_key',
                [password_hash, newQrKey, id]
            );
            
            if (result.rows.length > 0) {
                updatedLearners.push({
                    ...result.rows[0],
                    password: newPassword
                });
            }
        }
        
        await client.query('COMMIT');
        await logAction('RESET_PASSWORDS_LIST', `Сброшены пароли для ${updatedLearners.length} учащихся.`, req.admin.adminId);
        
        res.json({ learners: updatedLearners });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка при выборочном сбросе паролей:', error);
        res.status(500).json({ message: 'Ошибка сервера при сбросе паролей.' });
    } finally {
        client.release();
    }
};

module.exports = {
    getMaterialUrl,
    getWatermarkedMaterial,
    getAllLearners,
    createLearner,
    updateLearner,
    updateGroup,
    deleteLearner,
    deleteMultipleLearners,
    deleteGroup,
    exportLearners,
    importLearners,
    logLearnerLogout,
    recordLearnerActivity,
    getDebtors,
    resetGroupPasswords,
    getLearnerProfile,
    resetPasswordsForList,
};