const { pool } = require('../db');

const isPrivateIP = (ip) => {
    if (!ip) return true;
    const parts = ip.split('.').map(Number);
    return parts[0] === 10 ||
           (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
           (parts[0] === 192 && parts[1] === 168) ||
           ip === '127.0.0.1' ||
           ip === '::1';
};

const getSessionLogs = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const adminRole = req.admin.role;

    let whereClause = '';
    if (adminRole !== 'superadmin') {
        whereClause = "WHERE s.user_type = 'learner'";
    }

    try {
        const totalResult = await pool.query(`SELECT COUNT(*) FROM user_sessions s ${whereClause}`);
        const totalLogs = parseInt(totalResult.rows[0].count);
        const totalPages = Math.ceil(totalLogs / limit);

        const logsResult = await pool.query(
            `SELECT
                s.id,
                s.user_type,
                a.role,
                COALESCE(l.full_name, a.login) AS user_name,
                l.group_name,
                s.login_time,
                s.logout_time,
                s.last_activity,
                s.ip_address,
                s.is_active,
                (NOW() - s.last_activity < INTERVAL '1 minute') AS is_online
             FROM user_sessions s
             LEFT JOIN learners l ON s.user_id = l.id AND s.user_type = 'learner'
             LEFT JOIN admins a ON s.user_id = a.id AND s.user_type = 'admin'
             ${whereClause}
             ORDER BY s.login_time DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        
        const logs = logsResult.rows;

        const ipToCountry = {};
        const uniquePublicIPs = [...new Set(logs.map(log => log.ip_address).filter(ip => ip))];

        if (uniquePublicIPs.length > 0) {
            const geoPromises = uniquePublicIPs.map(ip => 
                fetch(`https://ip-api.com/json/${ip}?fields=countryCode`).then(res => res.json())
            );
            const geoResults = await Promise.all(geoPromises);
            
            uniquePublicIPs.forEach((ip, index) => {
                if (geoResults[index] && geoResults[index].countryCode) {
                    ipToCountry[ip] = geoResults[index].countryCode;
                }
            });
        }
        
        const logsWithFlags = logs.map(log => ({
            ...log,
            country_code: ipToCountry[log.ip_address] || null
        }));

        res.json({
            logs: logsWithFlags,
            totalPages: totalPages,
            currentPage: page,
        });
    } catch (error) {
        console.error('Ошибка при получении логов сессий:', error);
        res.status(500).json({ message: 'Ошибка при получении истории сессий' });
    }
};

module.exports = { getSessionLogs };