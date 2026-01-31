const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const submissionController = require('../controllers/submission.controller');

router.post(
  '/submit/:problemId',
  authMiddleware,
  submissionController.submitCode
);


router.get(
  '/:id',
  authMiddleware,
  submissionController.getSubmissionStatus
);


module.exports = router;
