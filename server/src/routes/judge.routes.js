const express = require('express');
const router = express.Router();
const judgeController = require('../controllers/judge.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { judgeLimiter } = require('../middlewares/rateLimiter');

router.post('/:submissionId', authMiddleware, judgeLimiter, judgeController.runJudge);

module.exports = router;