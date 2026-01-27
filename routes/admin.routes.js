const { Router } = require('express');
const { getAllAdmins, createAdmin, deleteAdmin, resetAdminPassword } = require('../controllers/admin.controller');
const { adminAuthMiddleware, superAdminAuthMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.get('/admins', adminAuthMiddleware, getAllAdmins);
router.post('/admins', superAdminAuthMiddleware, createAdmin);
router.delete('/admins/:id', superAdminAuthMiddleware, deleteAdmin);
router.put('/admins/:id/password', superAdminAuthMiddleware, resetAdminPassword);

module.exports = router;