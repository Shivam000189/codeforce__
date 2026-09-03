const Problem = require('../models/problem');

exports.create = async (req, res) => {
  try {
    const {
      title,
      statement,
      difficulty,
      tags,
      timeLimit,
      memoryLimit,
      constraints,
      editorial,
      testCases
    } = req.body;

    if (!title || !statement || !difficulty) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const problem = await Problem.create({
      title,
      statement,
      difficulty,
      ...(tags !== undefined && { tags }),
      ...(timeLimit !== undefined && { timeLimit }),
      ...(memoryLimit !== undefined && { memoryLimit }),
      ...(constraints !== undefined && { constraints }),
      ...(editorial !== undefined && { editorial }),
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
      tags: problem.tags,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      constraints: problem.constraints,
      editorial: problem.editorial,
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

exports.getAllProblems = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    // Keyword search in title
    const search = req.query.search || req.query.q;
    if (search && typeof search === 'string' && search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: escapedSearch, $options: 'i' };
    }

    // Difficulty filter
    if (req.query.difficulty && ['easy', 'medium', 'hard'].includes(req.query.difficulty.toLowerCase())) {
      filter.difficulty = req.query.difficulty.toLowerCase();
    }

    // Tags filter (supports single or comma-separated tags e.g. "array,math")
    const tagsParam = req.query.tags || req.query.tag;
    if (tagsParam) {
      const tagsArray = (Array.isArray(tagsParam) ? tagsParam : tagsParam.split(','))
        .map(t => t.trim())
        .filter(Boolean);
      if (tagsArray.length > 0) {
        filter.tags = { $in: tagsArray };
      }
    }

    // Sorting
    const allowedSortFields = ['createdAt', 'title', 'difficulty', 'timeLimit', 'memoryLimit'];
    const sortBy = allowedSortFields.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const [totalProblems, problems] = await Promise.all([
      Problem.countDocuments(filter),
      Problem.find(filter)
        .select('-testCases')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
    ]);

    const totalPages = Math.ceil(totalProblems / limit) || 1;

    res.json({
      totalProblems,
      totalPages,
      currentPage: page,
      limit,
      count: problems.length,
      problems
    });
  } catch (error) {
    console.error('Get all problems error:', error);
    res.status(500).json({
      message: 'Server error fetching problems',
      error: error.message
    });
  }
};