const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { loginLearner, loginAdmin, loginByQr } = require('../controllers/auth.controller');

const router = Router();

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Слишком много попыток входа с этого IP-адреса. Пожалуйста, попробуйте снова через 15 минут.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLearner);
router.post('/admin/login', adminLoginLimiter, loginAdmin);
router.post('/qr-login', loginByQr);

module.exports = router;