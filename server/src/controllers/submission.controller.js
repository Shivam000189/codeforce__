const Submission = require('../models/submission');
const { judgeSubmission } = require('../services/judge.service')



exports.submitCode = async (req, res) => {
  try {
    const submission = await Submission.create({
      problem: req.params.problemId,
      user: req.user.userId,
      language: req.body.language,
      sourceCode: req.body.sourceCode
    });

    // async judge (can be queue later)
    judgeSubmission(submission._id)
      .catch(err => console.error('Judge error:', err.message));

    res.status(201).json({
      message: "Submission received",
      submissionId: submission._id,
      status: "pending"
    });

  } catch (err) {
    res.status(400).json({
      message: "Submission failed",
      error: err.message
    });
  }
};


exports.getSubmissionStatus = async (req, res) => {
  try{
    const { id } = req.params;
    const submission = await Submission.findById(id)
      .select('status problem user');

      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      res.json({
        submissionId: submission._id,
        status: submission.status
      });
  }catch(error){
    res.status(400).json({
      msg:'Invalid submission id',
      error: error.message
    });
  }
};
