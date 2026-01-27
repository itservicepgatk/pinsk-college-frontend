const { Router } = require('express');
const { createBackupHandler, listBackups, restoreBackup, deleteBackup } = require('../controllers/backup.controller');
const { superAdminAuthMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.get('/backups', superAdminAuthMiddleware, listBackups);
router.post('/backups', superAdminAuthMiddleware, createBackupHandler);
router.post('/backups/restore', superAdminAuthMiddleware, restoreBackup);
router.delete('/backups', superAdminAuthMiddleware, deleteBackup);

module.exports = router;