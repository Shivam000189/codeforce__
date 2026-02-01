const express = require('express');
const router = express.Router();
const judgeController = require("../controllers/judge.controller");
// const { runJudge }  = require('../controllers/judge.controller')

router.post("/judge/:submissionId", judgeController.runJudge);

module.exports = router;

