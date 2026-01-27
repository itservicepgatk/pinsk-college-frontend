const { Router } = require('express');
const {
    upload,
    getMaterials,
    uploadMaterial,
    createFolder,
    deleteMaterial,
    deleteFolder,
    getSignedUrlForMaterial,
    transferMaterial
} = require('../controllers/material.controller');
const { adminAuthMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.get('/', adminAuthMiddleware, getMaterials);
router.get('/signed-url', adminAuthMiddleware, getSignedUrlForMaterial);
router.post('/upload', adminAuthMiddleware, upload.single('materialFile'), uploadMaterial);
router.post('/folder', adminAuthMiddleware, createFolder);
router.post('/transfer', adminAuthMiddleware, transferMaterial); 

router.delete('/delete', adminAuthMiddleware, deleteMaterial);
router.delete('/folder', adminAuthMiddleware, deleteFolder);

module.exports = router;