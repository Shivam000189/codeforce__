const Submission = require('../models/submission');
const Problem = require('../models/problem');
const { judgeSubmission } = require('../services/judge.service');

exports.submitCode = async (req, res) => {
  try {
    // Verify the problem exists before creating submission
    const problem = await Problem.findById(req.params.problemId);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    const submission = await Submission.create({
      problem: req.params.problemId,
      user: req.user.userId,
      language: req.body.language,
      sourceCode: req.body.sourceCode,
      status: 'pending'
    });

    // Run judge asynchronously so user gets immediate response
    setImmediate(async () => {
      try {
        const result = await judgeSubmission(submission._id);
        console.log(`Submission ${submission._id} judged as ${result}`);
      } catch (err) {
        console.error('Judge error:', err.message);
      }
    });

    res.status(201).json({
      message: 'Submission received',
      submissionId: submission._id,
      status: 'pending'
    });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(400).json({
      message: 'Submission failed',
      error: err.message
    });
  }
};

exports.getSubmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await Submission.findById(id)
      .select('status problem user language createdAt output error results')
      .populate('problem', 'title')
      .populate('user', 'name email');


    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json({
      submissionId: submission._id,
      status: submission.status,
      problem: submission.problem,
      user: submission.user,
      language: submission.language,
      submittedAt: submission.createdAt,
      output: submission.output,
      error: submission.error,
      results: submission.results
    });
  } catch (error) {
    console.error('Get submission error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid submission ID format' });
    }
    res.status(500).json({
      message: 'Server error fetching submission',
      error: error.message
    });
  }
};