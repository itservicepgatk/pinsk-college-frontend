const { Router } = require('express');
const { generateDebtorsCsv } = require('../controllers/report.controller.js');
const { adminAuthMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.get('/debtors-csv', adminAuthMiddleware, generateDebtorsCsv);

module.exports = router;