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
    console.error('Create problem error:', error);
    res.status(500).json({
      message: 'Failed to create problem',
      error: error.message
    });
  }
};

exports.getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    const sampleTestCases = problem.testCases.filter(
      tc => tc.isSample === true
    );

    res.json({
      _id: problem._id,
      title: problem.title,
      statement: problem.statement,
      difficulty: problem.difficulty,
      testCases: sampleTestCases
    });
  } catch (error) {
    console.error('Get problem error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid problem ID format' });
    }
    res.status(500).json({
      message: 'Server error fetching problem',
      error: error.message
    });
  }
};