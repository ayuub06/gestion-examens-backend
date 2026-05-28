const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

// ── Protect: verify JWT, attach req.user ─────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Non autorisé – token manquant.' });
    }

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // support both {userId} and {id} in the payload
    const userId = decoded.userId || decoded.id;
    const user   = await User.findById(userId).select('-password');

    if (!user)          return res.status(401).json({ success: false, message: 'Utilisateur introuvable.' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Compte désactivé.' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expiré. Reconnectez-vous.' });
    }
    return res.status(401).json({ success: false, message: 'Token invalide.' });
  }
};

// ── Role guard factory ────────────────────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Non autorisé.' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Accès refusé. Rôle requis : ${roles.join(' ou ')}.`,
    });
  }
  next();
};

const adminOnly   = requireRole('admin');
const profOrAdmin = requireRole('admin', 'professeur');

module.exports = { protect, requireRole, adminOnly, profOrAdmin };
