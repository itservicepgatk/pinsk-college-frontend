const { Router } = require('express');
const {
  getMaterialUrl,
  getWatermarkedMaterial,
  getAllLearners,
  createLearner,
  updateLearner,
  updateGroup,
  deleteLearner,
  deleteMultipleLearners,
  deleteGroup,
  exportLearners,
  importLearners,
  logLearnerLogout,
  recordLearnerActivity,
  getDebtors,
  resetGroupPasswords,
  getLearnerProfile,
  resetPasswordsForList,
} = require('../controllers/learner.controller');

const { adminAuthMiddleware, learnerAuthMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.get('/get-material-url', learnerAuthMiddleware, getMaterialUrl);
router.get('/material', learnerAuthMiddleware, getWatermarkedMaterial);
router.post('/logout', learnerAuthMiddleware, logLearnerLogout);
router.post('/heartbeat', learnerAuthMiddleware, recordLearnerActivity);

router.get('/debtors', adminAuthMiddleware, getDebtors);
router.get('/', adminAuthMiddleware, getAllLearners);
router.post('/', adminAuthMiddleware, createLearner);
router.post('/import', adminAuthMiddleware, importLearners);
router.get('/export', adminAuthMiddleware, exportLearners);
router.delete('/', adminAuthMiddleware, deleteMultipleLearners);
router.delete('/groups/:group_name', adminAuthMiddleware, deleteGroup);
router.put('/groups/update', adminAuthMiddleware, updateGroup);
router.put('/:id', adminAuthMiddleware, updateLearner);
router.delete('/:id', adminAuthMiddleware, deleteLearner);
router.get('/:id/profile', adminAuthMiddleware, getLearnerProfile);
router.post('/groups/reset-passwords', adminAuthMiddleware, resetGroupPasswords);
router.post('/reset-passwords-list', adminAuthMiddleware, resetPasswordsForList);

module.exports = router;