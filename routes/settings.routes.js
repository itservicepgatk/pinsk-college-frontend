const { Router } = require('express');
const { getMaintenanceStatus, setMaintenanceStatus } = require('../controllers/settings.controller.js');
const { superAdminAuthMiddleware } = require('../middleware/auth.middleware.js');

const router = Router();

router.get('/maintenance', getMaintenanceStatus);
router.post('/maintenance', superAdminAuthMiddleware, setMaintenanceStatus);

module.exports = router;