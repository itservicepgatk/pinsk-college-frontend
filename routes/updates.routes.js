const { Router } = require('express');
const { getUpdates, createUpdate, updateUpdate, deleteUpdate, getLastUpdateTimestamp } = require('../controllers/updates.controller');
const { adminAuthMiddleware, superAdminAuthMiddleware } = require('../middleware/auth.middleware');

const router = Router();

// Читать могут все админы
router.get('/', adminAuthMiddleware, getUpdates);

// Управление - только супер-админ
router.post('/', superAdminAuthMiddleware, createUpdate);
router.put('/:id', superAdminAuthMiddleware, updateUpdate);
router.delete('/:id', superAdminAuthMiddleware, deleteUpdate);
router.get('/check', adminAuthMiddleware, getLastUpdateTimestamp);

module.exports = router;