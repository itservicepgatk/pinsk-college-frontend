const { pool } = require('../db');
const { logAction } = require('../services/audit.service.js');
const { supabase } = require('../supabase');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

const getAllAnnouncements = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, adm.login as admin_login 
             FROM announcements a 
             LEFT JOIN admins adm ON a.admin_id = adm.id 
             WHERE a.deleted_at IS NULL
             ORDER BY a.is_pinned DESC, a.publish_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении объявлений' });
    }
};

const createAnnouncement = async (req, res) => {
    const { title, content, type, target_group, is_pinned, publish_at } = req.body;
    const adminId = req.admin.adminId;
    let fileUrl = null;

    if (req.file) {
        try {
            const filePath = `public/${Date.now()}-${req.file.originalname}`;
            const { error: uploadError } = await supabase.storage
                .from('announcements')
                .upload(filePath, req.file.buffer, {
                    contentType: req.file.mimetype,
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('announcements').getPublicUrl(filePath);
            fileUrl = data.publicUrl;
        } catch (error) {
            console.error('Ошибка загрузки файла в Supabase:', error);
            return res.status(500).json({ message: 'Не удалось загрузить файл.' });
        }
    }

    try {
        const targetGroupValue = type === 'group' ? target_group : null;
        const result = await pool.query(
            'INSERT INTO announcements (title, content, type, target_group, admin_id, file_url, is_pinned, publish_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [
                title,
                content,
                type,
                targetGroupValue,
                adminId,
                fileUrl,
                is_pinned || false,
                publish_at || new Date()
            ]
        );

        await logAction('CREATE_ANNOUNCEMENT', `Создано объявление: "${title}"`, adminId);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при создании объявления' });
    }
};

const updateAnnouncement = async (req, res) => {
    const { id } = req.params;
    const { title, content, type, target_group, is_pinned, publish_at } = req.body;
    const adminId = req.admin.adminId;

    try {
        const result = await pool.query(
            `UPDATE announcements 
             SET 
                title = $1, 
                content = $2, 
                type = $3, 
                target_group = $4, 
                is_pinned = $5, 
                publish_at = $6
             WHERE id = $7 
             RETURNING *`,
            [
                title,
                content,
                type,
                type === 'group' ? target_group : null,
                is_pinned,
                publish_at,
                id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Объявление не найдено' });
        }

        await logAction('UPDATE_ANNOUNCEMENT', `Отредактировано объявление: "${title}" (ID: ${id})`, adminId);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении объявления' });
    }
};

const deleteAnnouncement = async (req, res) => {
    const { id } = req.params;
    const adminId = req.admin.adminId;
    try {
        const announcementResult = await pool.query('SELECT title FROM announcements WHERE id = $1', [id]);
        if (announcementResult.rowCount === 0) {
            return res.status(404).json({ message: 'Объявление не найдено' });
        }
        const { title } = announcementResult.rows[0];

        await pool.query('UPDATE announcements SET deleted_at = NOW() WHERE id = $1', [id]);

        await logAction('SOFT_DELETE_ANNOUNCEMENT', `Объявление перемещено в корзину: "${title}"`, adminId);
        res.status(200).json({ message: 'Объявление успешно перемещено в корзину' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении объявления' });
    }
};

module.exports = {
    getAllAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    upload,
};