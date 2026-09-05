const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const problemController = require('../controllers/problem.controller');
const validate = require('../middlewares/validate');
const { createProblemSchema } = require('../middlewares/validators');

router.post(
  '/create-problem',
  authMiddleware,
  requireRole('admin', 'moderator'),
  validate(createProblemSchema),
  problemController.create
);
router.get('/', authMiddleware, problemController.getAllProblems);
router.get('/list', authMiddleware, problemController.getAllProblems);
router.get('/:id', authMiddleware, problemController.getProblemById);

module.exports = router;