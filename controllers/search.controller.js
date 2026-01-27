const { pool } = require('../db');

const globalSearch = async (req, res) => {
    const { term } = req.query;

    if (!term || term.length < 3) {
        return res.json({ learners: [], groups: [] });
    }

    const searchTerm = `%${term}%`;

    try {
        const learnersQuery = pool.query(
            "SELECT id, full_name, group_name FROM learners WHERE full_name ILIKE $1 OR login ILIKE $1 LIMIT 5",
            [searchTerm]
        );

        const groupsQuery = pool.query(
            "SELECT DISTINCT group_name FROM learners WHERE group_name ILIKE $1 LIMIT 5",
            [searchTerm]
        );

        const [learnersResult, groupsResult] = await Promise.all([learnersQuery, groupsQuery]);

        res.json({
            learners: learnersResult.rows,
            groups: groupsResult.rows.map(r => r.group_name),
        });

    } catch (error) {
        console.error('Ошибка глобального поиска:', error);
        res.status(500).json({ message: 'Ошибка на сервере при выполнении поиска.' });
    }
};

module.exports = {
    globalSearch,
};