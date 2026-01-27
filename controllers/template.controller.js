const { pool } = require('../db');
const { logAction } = require('../services/audit.service.js');

const getAllTemplates = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM broadcast_templates WHERE deleted_at IS NULL ORDER BY title ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении шаблонов' });
    }
};

const createTemplate = async (req, res) => {
    const { title, content } = req.body;
    const adminId = req.admin.adminId;

    try {
        const result = await pool.query(
            'INSERT INTO broadcast_templates (title, content, admin_id) VALUES ($1, $2, $3) RETURNING *',
            [title, content, adminId]
        );
        await logAction('CREATE_TEMPLATE', `Создан шаблон: "${title}"`, adminId);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при создании шаблона' });
    }
};

const updateTemplate = async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    const adminId = req.admin.adminId;

    try {
        const result = await pool.query(
            'UPDATE broadcast_templates SET title = $1, content = $2 WHERE id = $3 RETURNING *',
            [title, content, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Шаблон не найден' });
        }
        await logAction('UPDATE_TEMPLATE', `Обновлен шаблон: "${title}" (ID: ${id})`, adminId);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении шаблона' });
    }
};

const deleteTemplate = async (req, res) => {
    const { id } = req.params;
    const adminId = req.admin.adminId;

    try {
        const result = await pool.query('UPDATE broadcast_templates SET deleted_at = NOW() WHERE id = $1 RETURNING title', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Шаблон не найден' });
        }
        const deletedTitle = result.rows[0].title;
        await logAction('SOFT_DELETE_TEMPLATE', `Шаблон перемещен в корзину: "${deletedTitle}" (ID: ${id})`, adminId);
        res.status(200).json({ message: 'Шаблон успешно перемещен в корзину' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении шаблона' });
    }
};

module.exports = {
    getAllTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
};