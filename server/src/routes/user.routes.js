const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validate');
const { updateUserRoleSchema } = require('../middlewares/validators');
const userController = require('../controllers/user.controller');

// PATCH /api/users/:id/role - Restricted to Admins only
router.patch(
  '/:id/role',
  authMiddleware,
  requireRole('admin'),
  validate(updateUserRoleSchema),
  userController.updateUserRole
);

module.exports = router;
