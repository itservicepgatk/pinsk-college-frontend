const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { logAction } = require('../services/audit.service.js');

const getAllAdmins = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, login, role FROM admins ORDER BY login');
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении списка администраторов:', error);
    res.status(500).json({ message: 'Не удалось получить список администраторов' });
  }
};

const createAdmin = async (req, res) => {
  const { login, password, role } = req.body;
  if (!login || !password) {
    return res.status(400).json({ message: 'Логин и пароль обязательны' });
  }
  if (role && role !== 'admin' && role !== 'superadmin') {
      return res.status(400).json({ message: 'Недопустимая роль' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO admins (login, password_hash, role) VALUES ($1, $2, $3) RETURNING id, login, role',
      [login, password_hash, role || 'admin']
    );
    const newAdmin = result.rows[0];

    await logAction('CREATE_ADMIN', `Создан администратор: ${newAdmin.login} (Роль: ${newAdmin.role})`, req.admin.adminId);
    res.status(201).json(newAdmin);
  } catch (error) {
    console.error('Ошибка при создании администратора:', error);
    if (error.code === '23505') { // Уникальный ключ
        return res.status(409).json({ message: 'Администратор с таким логином уже существует' });
    }
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

const deleteAdmin = async (req, res) => {
    const { id } = req.params;
    // Запрещаем удалять самого себя
    if (Number(id) === req.admin.adminId) {
        return res.status(403).json({ message: 'Нельзя удалить собственный аккаунт' });
    }
    try {
        const result = await pool.query('DELETE FROM admins WHERE id = $1 RETURNING login', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Администратор не найден' });
        }
        const deletedAdminLogin = result.rows[0].login;
        await logAction('DELETE_ADMIN', `Удален администратор: ${deletedAdminLogin} (ID: ${id})`, req.admin.adminId);
        res.status(200).json({ message: `Администратор ${deletedAdminLogin} успешно удален` });
    } catch (error) {
        console.error(`Ошибка при удалении администратора (ID: ${id}):`, error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
};

const resetAdminPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Пароль должен быть не менее 6 символов' });
    }

    if (Number(id) === req.admin.adminId) {
        return res.status(403).json({ message: 'Нельзя сбросить собственный пароль через админ-панель.' });
    }

    try {
        const password_hash = await bcrypt.hash(newPassword, 10);
        const result = await pool.query(
            'UPDATE admins SET password_hash = $1 WHERE id = $2 RETURNING login',
            [password_hash, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Администратор не найден' });
        }

        const login = result.rows[0].login;
        await logAction('RESET_ADMIN_PASSWORD', `Сброшен пароль администратора: ${login} (ID: ${id})`, req.admin.adminId);
        
        res.status(200).json({ message: `Пароль для ${login} успешно изменен.` });
    } catch (error) {
        console.error('Ошибка сброса пароля админа:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
};

module.exports = { getAllAdmins, createAdmin, deleteAdmin, resetAdminPassword };