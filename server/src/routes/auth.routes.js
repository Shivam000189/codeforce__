const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware =require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/create-problem', authMiddleware, problemController.create);



module.exports = router;







