const { pool } = require('../db');
const { logAction } = require('../services/audit.service.js');

// Вспомогательная функция для экранирования данных для CSV
const escapeCsv = (str) => {
    if (str === null || str === undefined) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
};

const generateDebtorsCsv = async (req, res) => {
    try {
        // Запрос для получения всех должников
        const result = await pool.query(`
            SELECT full_name, group_name, specialty, academic_debts
            FROM learners
            WHERE academic_debts IS NOT NULL 
              AND academic_debts != '' 
              AND lower(academic_debts) != 'нет' 
              AND lower(academic_debts) != 'отсутствуют'
            ORDER BY group_name, full_name
        `);

        const debtors = result.rows;

        // Формируем CSV
        const headers = ['"ФИО"', '"Группа"', '"Специальность"', '"Задолженность"'];
        const csvRows = [headers.join(',')];

        debtors.forEach(debtor => {
            const row = [
                escapeCsv(debtor.full_name),
                escapeCsv(debtor.group_name),
                escapeCsv(debtor.specialty),
                escapeCsv(debtor.academic_debts)
            ].join(',');
            csvRows.push(row);
        });

        const csvContent = csvRows.join('\n');

        await logAction('GENERATE_REPORT', 'Сгенерирован отчет по должникам (CSV)', req.admin.adminId);

        // Устанавливаем заголовки, чтобы браузер скачал файл
        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.header('Content-Disposition', `attachment; filename="debtors_report_${new Date().toISOString().split('T')[0]}.csv"`);
        
        // Отправляем BOM для корректного отображения кириллицы в Excel
        res.status(200).send('\uFEFF' + csvContent);

    } catch (error) {
        console.error('Ошибка при генерации отчета по должникам:', error);
        res.status(500).json({ message: 'Не удалось сгенерировать отчет.' });
    }
};

module.exports = {
    generateDebtorsCsv,
};