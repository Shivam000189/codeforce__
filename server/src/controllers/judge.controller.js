const { judgeSubmission } = require('../services/judge.service');

exports.runJudge = async (req, res) => {
  try {
    const submissionId = req.params.submissionId;

    const result = await judgeSubmission(submissionId);

    res.json({
      message: 'Judge completed successfully',
      result
    });
  } catch (err) {
    console.error('Manual judge error:', err);
    res.status(500).json({
      message: 'Judge error',
      error: err.message
    });
  }
};