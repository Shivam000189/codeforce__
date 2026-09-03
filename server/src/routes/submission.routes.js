const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { submissionLimiter } = require('../middlewares/rateLimiter');
const submissionController = require('../controllers/submission.controller');
const validate = require('../middlewares/validate');
const { submitCodeSchema } = require('../middlewares/validators');

router.post(
  '/submit/:problemId',
  authMiddleware,
  submissionLimiter,
  validate(submitCodeSchema),
  submissionController.submitCode
);

router.get(
  '/:id',
  authMiddleware,
  submissionController.getSubmissionStatus
);

module.exports = router;