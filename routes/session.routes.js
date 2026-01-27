const { Router } = require('express');
const { getSessionLogs } = require('../controllers/session.controller');
const { adminAuthMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.get('/sessions', adminAuthMiddleware, getSessionLogs);

module.exports = router;