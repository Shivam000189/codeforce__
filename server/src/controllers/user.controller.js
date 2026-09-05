const User = require('../models/User');

/**
 * Update a user's role (Admin only).
 * Includes last-admin demotion safeguard and audit trail logging.
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role: newRole } = req.body;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentRole = targetUser.role;

    // Safeguard: Check if the admin is demoting themselves and is the last remaining admin
    const isSelfDemotion = req.user.userId === id && currentRole === 'admin' && newRole !== 'admin';
    if (isSelfDemotion) {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: 'Cannot demote the last remaining admin in the system'
        });
      }
    }

    // Update role
    targetUser.role = newRole;
    await targetUser.save();

    // Audit trail logging
    console.log(
      `[AUDIT] [${new Date().toISOString()}] Admin ${req.user.userId} updated user ${targetUser._id} (${targetUser.email}) role from '${currentRole}' to '${newRole}'`
    );

    res.json({
      message: 'User role updated successfully',
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    res.status(500).json({
      message: 'Server error updating user role',
      error: error.message
    });
  }
};
