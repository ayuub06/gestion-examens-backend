const roleMiddleware = (allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Non autorisé.' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Accès refusé. Rôle requis: ${allowedRoles.join(' ou ')}.`,
    });
  }
  next();
};

module.exports = roleMiddleware;
