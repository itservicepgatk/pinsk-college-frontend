const { pool } = require('../db');

const getDashboardStats = async (req, res) => {
  try {
    const statsResult = await pool.query(`
            SELECT
                COUNT(*) AS total_learners,
                COUNT(*) FILTER (
                    WHERE academic_debts IS NOT NULL 
                    AND academic_debts != '' 
                    AND lower(academic_debts) != 'нет' 
                    AND lower(academic_debts) != 'отсутствуют'
                ) AS debtors_count
            FROM learners;
        `);
    const stats = {
      totalLearners: parseInt(statsResult.rows[0].total_learners),
      debtorsCount: parseInt(statsResult.rows[0].debtors_count),
    };
    res.json(stats);
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    res.status(500).json({ message: 'Ошибка при получении статистики' });
  }
};

const getGroupStats = async (req, res) => {
  try {
    const groupsResult = await pool.query(`
        WITH group_specialties AS (
            SELECT DISTINCT ON (group_name)
                group_name,
                specialty
            FROM learners
            WHERE specialty IS NOT NULL AND specialty != ''
        ),
        debtors AS (
            SELECT
                id,
                full_name,
                group_name,
                academic_debts
            FROM learners
            WHERE academic_debts IS NOT NULL 
                AND academic_debts != '' 
                AND lower(academic_debts) != 'нет' 
                AND lower(academic_debts) != 'отсутствуют'
        )
        SELECT 
            l.group_name, 
            gs.specialty,
            COUNT(l.id) AS total_learners,
            COUNT(d.id) AS debtor_count,
            json_agg(
                json_build_object('full_name', d.full_name, 'debt', d.academic_debts)
            ) FILTER (WHERE d.id IS NOT NULL) AS debtors_list
        FROM learners l
        LEFT JOIN group_specialties gs ON l.group_name = gs.group_name
        LEFT JOIN debtors d ON l.id = d.id
        GROUP BY l.group_name, gs.specialty
        ORDER BY l.group_name ASC;
    `);
    res.json(groupsResult.rows);
  } catch (error) {
    console.error('Ошибка при получении статистики по группам:', error);
    res.status(500).json({ message: 'Ошибка при получении статистики по группам' });
  }
};

module.exports = {
  getDashboardStats,
  getGroupStats,
};