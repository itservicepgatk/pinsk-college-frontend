const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const { logAction } = require('../services/audit.service.js');

const getAuditLogs = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const offset = (page - 1) * limit;

  const { adminId, actionType, startDate, endDate, search } = req.query;

  let queryParams = [];
  let whereClauses = ["al.action_type NOT IN ('ADMIN_LOGIN', 'ADMIN_LOGOUT')"];
  let paramIndex = 1;

  if (adminId) {
    whereClauses.push(`al.admin_id = $${paramIndex++}`);
    queryParams.push(adminId);
  }
  if (actionType) {
    whereClauses.push(`al.action_type = $${paramIndex++}`);
    queryParams.push(actionType);
  }
  if (startDate) {
    whereClauses.push(`al.timestamp::date >= $${paramIndex++}`);
    queryParams.push(startDate);
  }
  if (endDate) {
    whereClauses.push(`al.timestamp::date <= $${paramIndex++}`);
    queryParams.push(endDate);
  }
  if (search) {
    whereClauses.push(`al.details ILIKE $${paramIndex++}`);
    queryParams.push(`%${search}%`);
  }
  
  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  try {
    const totalResult = await pool.query(`
      SELECT COUNT(*) 
      FROM audit_log al 
      ${whereClause}`, queryParams);
    
    const totalLogs = parseInt(totalResult.rows[0].count);
    const totalPages = Math.ceil(totalLogs / limit);

    const logsResult = await pool.query(
      `SELECT
         al.id,
         al.timestamp::TEXT as timestamp,
         al.action_type,
         al.details,
         a.login as admin_login
       FROM audit_log al
       LEFT JOIN admins a ON al.admin_id = a.id
       ${whereClause}
       ORDER BY al.timestamp DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    );

    res.json({
      logs: logsResult.rows,
      totalPages: totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Ошибка при получении аудит-лога:', error);
    res.status(500).json({ message: 'Ошибка при получении истории действий' });
  }
};

const getActionTypes = async (req, res) => {
  try {
    const result = await pool.query("SELECT DISTINCT action_type FROM audit_log WHERE action_type NOT IN ('ADMIN_LOGIN', 'ADMIN_LOGOUT') ORDER BY action_type");
    res.json(result.rows.map(row => row.action_type));
  } catch (error) {
    console.error('Ошибка при получении типов действий:', error);
    res.status(500).json({ message: 'Не удалось получить типы действий' });
  }
};

const exportAuditLogs = async (req, res) => {
  const { adminId, actionType, startDate, endDate, search } = req.query;
  let queryParams = [];
  let whereClauses = ["al.action_type NOT IN ('ADMIN_LOGIN', 'ADMIN_LOGOUT')"];
  let paramIndex = 1;

  if (adminId) {
    whereClauses.push(`al.admin_id = $${paramIndex++}`);
    queryParams.push(adminId);
  }
  if (actionType) {
    whereClauses.push(`al.action_type = $${paramIndex++}`);
    queryParams.push(actionType);
  }
  if (startDate) {
    whereClauses.push(`al.timestamp::date >= $${paramIndex++}`);
    queryParams.push(startDate);
  }
  if (endDate) {
    whereClauses.push(`al.timestamp::date <= $${paramIndex++}`);
    queryParams.push(endDate);
  }
  if (search) {
    whereClauses.push(`al.details ILIKE $${paramIndex++}`);
    queryParams.push(`%${search}%`);
  }
  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  try {
    const logsResult = await pool.query(
      `SELECT
         al.id,
         al.timestamp,
         al.action_type,
         al.details,
         a.login as admin_login
       FROM audit_log al
       LEFT JOIN admins a ON al.admin_id = a.id
       ${whereClause}
       ORDER BY al.timestamp DESC`,
      queryParams
    );
    res.json(logsResult.rows);
  } catch (error) {
    console.error('Ошибка при экспорте аудит-лога:', error);
    res.status(500).json({ message: 'Ошибка при экспорте истории действий' });
  }
};

const clearAuditLogs = async (req, res) => {
    const { endDate, password } = req.body;
    const adminId = req.admin.adminId;

    if (!endDate || !password) {
        return res.status(400).json({ message: 'Необходимо указать дату и пароль.' });
    }

    try {
        const adminResult = await pool.query('SELECT password_hash FROM admins WHERE id = $1', [adminId]);
        if (adminResult.rows.length === 0) {
            return res.status(404).json({ message: 'Администратор не найден.' });
        }
        const isPasswordCorrect = await bcrypt.compare(password, adminResult.rows[0].password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Неверный пароль.' });
        }

        const result = await pool.query("DELETE FROM audit_log WHERE timestamp::date <= $1 AND action_type NOT IN ('ADMIN_LOGIN', 'ADMIN_LOGOUT')", [endDate]);

        const logDetails = `Очищены логи аудита до ${endDate}. Удалено записей: ${result.rowCount}.`;
        await pool.query('INSERT INTO audit_log (action_type, details, admin_id) VALUES ($1, $2, $3)', ['CLEAR_AUDIT_LOG', logDetails, adminId]);

        res.status(200).json({ message: logDetails });

    } catch (error) {
        console.error('Ошибка при очистке логов:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при очистке логов.' });
    }
};

const deleteAuditLogEntry = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM audit_log WHERE id = $1 RETURNING id, details', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Запись лога не найдена.' });
        }
        res.status(200).json({ message: `Запись лога #${result.rows[0].id} успешно удалена.` });
    } catch (error) {
        console.error('Ошибка при удалении записи лога:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

const logAdminLogout = async (req, res) => {
    const { reason } = req.body;
    const adminId = req.admin.adminId;
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',').shift() || req.socket.remoteAddress;

    try {
        const details = `Администратор вышел из системы. Причина: ${reason || 'Не указана'}.`;
        await logAction('ADMIN_LOGOUT', details, adminId, ipAddress);

        await pool.query(
            'UPDATE user_sessions SET is_active = false, logout_time = NOW() WHERE user_id = $1 AND user_type = \'admin\' AND is_active = true',
            [adminId]
        );

        res.status(200).json({ message: 'Logout logged successfully.' });
    } catch (error) {
        console.error('Ошибка при логировании выхода:', error);
        res.status(500).json({ message: 'Не удалось записать действие выхода.' });
    }
};

module.exports = { 
    getAuditLogs, 
    getActionTypes,
    exportAuditLogs,
    clearAuditLogs,
    deleteAuditLogEntry,
    logAdminLogout,
};