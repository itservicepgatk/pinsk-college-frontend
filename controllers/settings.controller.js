const { pool } = require('../db');
const { logAction } = require('../services/audit.service.js');

const getMaintenanceStatus = async (req, res) => {
    try {
        const result = await pool.query("SELECT key, value FROM settings");
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value === 'true';
        });
        res.json(settings);
    } catch (error) {
        console.error('Ошибка при получении настроек:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

const setMaintenanceStatus = async (req, res) => {
    const { key, value, enabled } = req.body;
    
    const finalKey = key || 'maintenance_mode';
    const finalValue = typeof value === 'boolean' ? value : enabled;

    if (typeof finalValue !== 'boolean') {
        return res.status(400).json({ message: 'Неверное значение' });
    }

    try {
        await pool.query(
            "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
            [finalKey, finalValue.toString()]
        );
        
        let actionDetail = '';
        if (finalKey === 'maintenance_mode') {
            actionDetail = finalValue ? 'Включен режим тестирования' : 'Выключен режим тестирования';
        } else if (finalKey === 'admin_login_notifications') {
            actionDetail = finalValue ? 'Включены уведомления о входе в ТГ' : 'Выключены уведомления о входе в ТГ';
        }

        await logAction('SETTINGS_UPDATE', actionDetail, req.admin.adminId);
        res.status(200).json({ message: 'Настройка успешно обновлена' });
    } catch (error) {
        console.error('Ошибка при обновлении настройки:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

module.exports = { getMaintenanceStatus, setMaintenanceStatus };