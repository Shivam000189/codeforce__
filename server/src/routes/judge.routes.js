const express = require('express');
const router = express.Router();
const judgeController = require('../controllers/judge.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.post("/judge/:submissionId", authMiddleware, judgeController.runJudge);

module.exports = router;

