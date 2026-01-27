const { Router } = require('express');
const { 
    getAllAnnouncements, 
    createAnnouncement, 
    updateAnnouncement, 
    deleteAnnouncement, 
    upload 
} = require('../controllers/announcement.controller');
const { adminAuthMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.get('/', adminAuthMiddleware, getAllAnnouncements);
router.post('/', adminAuthMiddleware, upload.single('announcementFile'), createAnnouncement);
router.put('/:id', adminAuthMiddleware, updateAnnouncement);
router.delete('/:id', adminAuthMiddleware, deleteAnnouncement);

module.exports = router;