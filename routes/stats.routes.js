const { Router } = require('express');
const { getDashboardStats, getGroupStats } = require('../controllers/stats.controller');
const { adminAuthMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.get('/', adminAuthMiddleware, getDashboardStats);
router.get('/groups', adminAuthMiddleware, getGroupStats);

module.exports = router;