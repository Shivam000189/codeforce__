const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const problemController = require('../controllers/problem.controller');

router.post('/create-problem', authMiddleware, problemController.create);
router.get('/:id', authMiddleware, problemController.getProblemById);

module.exports = router;
