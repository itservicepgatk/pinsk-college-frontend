const { pool } = require('../db');
const { supabase } = require('../supabase');
const { logAction } = require('../services/audit.service.js');

const getTrashItems = async (req, res) => {
    try {
        const learnersQuery = pool.query("SELECT id, full_name, group_name, deleted_at FROM learners WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC");
        const materialsQuery = pool.query("SELECT id, original_path, deleted_at FROM deleted_materials ORDER BY deleted_at DESC");

        const [learners, materials] = await Promise.all([learnersQuery, materialsQuery]);

        res.json({
            learners: learners.rows,
            materials: materials.rows,
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении элементов из корзины.' });
    }
};

const restoreItem = async (req, res) => {
    const { type, id } = req.body;
    try {
        if (type === 'learner') {
            await pool.query("UPDATE learners SET deleted_at = NULL WHERE id = $1", [id]);
        } else if (type === 'material') {
            const result = await pool.query("SELECT original_path, trashed_path FROM deleted_materials WHERE id = $1", [id]);
            if (result.rows.length > 0) {
                const { original_path, trashed_path } = result.rows[0];
                const { error } = await supabase.storage.from('materials').move(trashed_path, original_path);
                if (error) throw error;
                await pool.query("DELETE FROM deleted_materials WHERE id = $1", [id]);
            }
        }
        await logAction('RESTORE_FROM_TRASH', `Восстановлен объект типа ${type} (ID: ${id})`, req.admin.adminId);
        res.status(200).json({ message: 'Элемент успешно восстановлен.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при восстановлении.' });
    }
};

const deleteMultipleItems = async (req, res) => {
    const { type, ids } = req.body;
    if (!ids || ids.length === 0) return res.status(400).json({ message: 'Нет выбранных элементов' });

    try {
        if (type === 'learner') {
            await pool.query("DELETE FROM learners WHERE id = ANY($1::int[])", [ids]);
        } else if (type === 'material') {
            const result = await pool.query("SELECT trashed_path FROM deleted_materials WHERE id = ANY($1::int[])", [ids]);
            const pathsToRemove = result.rows.map(row => row.trashed_path);
            
            if (pathsToRemove.length > 0) {
                const { error } = await supabase.storage.from('materials').remove(pathsToRemove);
                if (error) throw error;
            }
            await pool.query("DELETE FROM deleted_materials WHERE id = ANY($1::int[])", [ids]);
        }
        
        await logAction('PERMANENT_DELETE', `Удалено навсегда ${ids.length} объектов типа ${type}`, req.admin.adminId);
        res.status(200).json({ message: `Успешно удалено элементов: ${ids.length}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при окончательном удалении.' });
    }
};

const emptyTrash = async (req, res) => {
    const { type } = req.body;
    try {
        let count = 0;
        if (type === 'learner') {
            const result = await pool.query("DELETE FROM learners WHERE deleted_at IS NOT NULL");
            count = result.rowCount;
        } else if (type === 'material') {
            const result = await pool.query("SELECT trashed_path FROM deleted_materials");
            const pathsToRemove = result.rows.map(row => row.trashed_path);
            
            if (pathsToRemove.length > 0) {
                const { error } = await supabase.storage.from('materials').remove(pathsToRemove);
                if (error) throw error;
            }
            const dbResult = await pool.query("DELETE FROM deleted_materials");
            count = dbResult.rowCount;
        }

        await logAction('EMPTY_TRASH', `Корзина очищена для типа ${type}. Удалено: ${count}`, req.admin.adminId);
        res.status(200).json({ message: `Корзина очищена. Удалено объектов: ${count}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при очистке корзины.' });
    }
};

module.exports = {
    getTrashItems,
    restoreItem,
    deleteMultipleItems,
    emptyTrash
};