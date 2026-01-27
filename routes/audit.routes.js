const { Router } = require('express');
const { 
    getAuditLogs, 
    getActionTypes, 
    exportAuditLogs, 
    clearAuditLogs, 
    deleteAuditLogEntry,
    logAdminLogout
} = require('../controllers/audit.controller');
const { adminAuthMiddleware, superAdminAuthMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.get('/audit', adminAuthMiddleware, getAuditLogs);
router.get('/audit/actions', adminAuthMiddleware, getActionTypes);
router.post('/audit/logout', adminAuthMiddleware, logAdminLogout);

router.get('/audit/export', superAdminAuthMiddleware, exportAuditLogs);
router.post('/audit/clear', superAdminAuthMiddleware, clearAuditLogs);
router.delete('/audit/:id', superAdminAuthMiddleware, deleteAuditLogEntry);

module.exports = router;