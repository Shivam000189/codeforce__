const express = require('express');
const { judgeSubmission } = require('../services/judge.service');
const router = express.Router();


router.post("/judge/:submissionId", judgeSubmission.runJudge);

module.exports = router;

