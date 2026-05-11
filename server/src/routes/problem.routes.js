const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const problemController = require('../controllers/problem.controller');
const validate = require('../middlewares/validate');
const { createProblemSchema } = require('../middlewares/validators');

router.post('/create-problem', authMiddleware, validate(createProblemSchema), problemController.create);
router.get('/:id', authMiddleware, problemController.getProblemById);

module.exports = router;