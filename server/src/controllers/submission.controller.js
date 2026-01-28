const Submission = require('../models/submission');
const mongoose = require('mongoose');

exports.submitCode = async (req, res) => {
  try {
    const { sourceCode, language } = req.body;
    const { problemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(problemId)) {
        return res.status(400).json({ message: 'Invalid problem ID format' });
      }

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
