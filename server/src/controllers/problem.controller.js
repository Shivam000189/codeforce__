const Problem = require('../models/problem');

exports.create = async (req, res) => {
  try {
    const { title, statement, difficulty, testCases } = req.body;

    if (!title || !statement || !difficulty) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const problem = await Problem.create({
      title,
      statement,
      difficulty,
      testCases,
      createdBy: req.user.userId
    });

    res.status(201).json({
      message: 'Problem created successfully',
      problemId: problem._id
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create problem',
      error: error.message
    });
  }
};
