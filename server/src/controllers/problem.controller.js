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



exports.getProblemById = async (req, res) => {
  const problem = await Problem.findById(req.params.id);
  
  if(!problem) {
    return res.status(400).json({msg:"Problem not found"});
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
}