const { pool } = require('../db');

const getUpdates = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.*, a.login as author_name 
            FROM system_updates u 
            LEFT JOIN admins a ON u.author_id = a.id 
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении обновлений:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

const createUpdate = async (req, res) => {
    const { title, content } = req.body;
    const authorId = req.admin.adminId;

    if (!title || !content) {
        return res.status(400).json({ message: 'Заголовок и содержание обязательны' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Создаем новость
        const result = await client.query(
            'INSERT INTO system_updates (title, content, author_id) VALUES ($1, $2, $3) RETURNING *',
            [title, content, authorId]
        );

        // 2. Обновляем метку времени последнего обновления
        await client.query(
            "INSERT INTO settings (key, value) VALUES ('last_news_update', NOW()) ON CONFLICT (key) DO UPDATE SET value = NOW()"
        );

        await client.query('COMMIT');
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка при создании обновления:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    } finally {
        client.release();
    }
};

const updateUpdate = async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;

    try {
        const result = await pool.query(
            'UPDATE system_updates SET title = $1, content = $2 WHERE id = $3 RETURNING *',
            [title, content, id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Запись не найдена' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при обновлении новости:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

const deleteUpdate = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM system_updates WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Запись не найдена' });
        }

        res.json({ message: 'Новость удалена' });
    } catch (error) {
        console.error('Ошибка при удалении новости:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

const getLastUpdateTimestamp = async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM settings WHERE key = 'last_news_update'");
        const timestamp = result.rows.length > 0 ? result.rows[0].value : null;
        res.json({ timestamp });
    } catch (error) {
        console.error('Ошибка получения даты обновлений:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

module.exports = { getUpdates, createUpdate, updateUpdate, deleteUpdate, getLastUpdateTimestamp };