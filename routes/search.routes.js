const { Router } = require('express');
const { globalSearch } = require('../controllers/search.controller');
const { adminAuthMiddleware } = require('../middleware/auth.middleware');

const router = Router();

router.get('/global', adminAuthMiddleware, globalSearch);

module.exports = router;