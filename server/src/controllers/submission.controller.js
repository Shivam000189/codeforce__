const Submission = require('../models/submission');

exports.submitCode = async (req, res) => {
  try {
    const { sourceCode, language } = req.body;
    const { problemId } = req.params;

    const submission = await Submission.create({
      user: req.user.userId,
      problem: problemId,
      sourceCode,
      language,
      status: 'pending'
    });

    res.status(201).json({
      message: 'Submission received',
      submissionId: submission._id,
      status: submission.status
    });
  } catch (error) {
    res.status(500).json({
      message: 'Submission failed',
      error: error.message
    });
  }
};
