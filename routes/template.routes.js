const { Router } = require('express');
const {
    getAllTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
} = require('../controllers/template.controller');
const { adminAuthMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.get('/', adminAuthMiddleware, getAllTemplates);
router.post('/', adminAuthMiddleware, createTemplate);
router.put('/:id', adminAuthMiddleware, updateTemplate);
router.delete('/:id', adminAuthMiddleware, deleteTemplate);

module.exports = router;