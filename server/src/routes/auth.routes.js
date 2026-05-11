const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { registerSchema, loginSchema } = require('../middlewares/validators');

router.post('/register',validate(registerSchema), authController.register);
router.post('/login',validate(loginSchema), authController.login);

module.exports = router;