const { Router } = require('express');
const { getTrashItems, restoreItem, deleteMultipleItems, emptyTrash } = require('../controllers/trash.controller');
const { adminAuthMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.get('/', adminAuthMiddleware, getTrashItems);
router.post('/restore', adminAuthMiddleware, restoreItem);
router.post('/delete-multiple', adminAuthMiddleware, deleteMultipleItems);
router.post('/empty', adminAuthMiddleware, emptyTrash);

module.exports = router;