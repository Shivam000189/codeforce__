/**
 * Role-Based Access Control Middleware
 * Restricts route access to users with specified role(s).
 *
 * @param  {...string|string[]} roles - Allowed user roles (e.g. 'admin', 'moderator')
 * @returns {Function} Express middleware function
 */
const requireRole = (...roles) => {
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. Authentication required' });
    }

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions' });
    }

    next();
  };
};

module.exports = {
  requireRole
};
