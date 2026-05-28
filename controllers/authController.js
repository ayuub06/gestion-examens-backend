const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const JWT_EXPIRE = process.env.JWT_EXPIRE  || '7d';

const generateToken = (userId) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRE });

// ── Serialize user for responses (no password) ────────────────────────────────
const serializeUser = (u) => ({
  id:              u._id,
  name:            u.name,
  prenom:          u.prenom,
  email:           u.email,
  role:            u.role,
  departement:     u.departement,
  niveau:          u.niveau,
  numero_etudiant: u.numero_etudiant,
  specialization:  u.specialization,
  telephone:       u.telephone,
  isActive:        u.isActive,
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email et mot de passe requis.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Compte désactivé. Contactez un administrateur.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });

    const token = generateToken(user._id);
    res.json({ success: true, token, user: serializeUser(user) });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, prenom, email, password, role, numero_etudiant, departement, niveau, specialization } = req.body;

    const existing = await User.findOne({ email: email?.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Email déjà utilisé.' });

    const user = new User({ name, prenom, email, password, role, numero_etudiant, departement, niveau, specialization });
    await user.save();

    res.status(201).json({ success: true, token: generateToken(user._id), user: serializeUser(user) });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Email déjà utilisé.' });
    console.error('register error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── POST /api/auth/admin/create-user ─────────────────────────────────────────
exports.adminCreateUser = async (req, res) => {
  try {
    const { name, prenom, email, password, role, numero_etudiant, departement, niveau, specialization } = req.body;

    if (!name || !prenom || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Champs obligatoires : name, prenom, email, password, role.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Email déjà utilisé.' });

    const user = new User({ name, prenom, email, password, role, numero_etudiant, departement, niveau, specialization });
    await user.save();

    res.status(201).json({ success: true, message: `Utilisateur (${role}) créé avec succès.`, user: serializeUser(user) });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Email déjà utilisé.' });
    console.error('adminCreateUser error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    // req.user already set by protect middleware
    res.json({ success: true, user: serializeUser(req.user) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── GET /api/auth/users  (admin only) ─────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const { role, departement, niveau, search } = req.query;
    const filter = {};
    if (role)       filter.role       = role;
    if (departement) filter.departement = departement;
    if (niveau)     filter.niveau     = niveau;
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ name: re }, { prenom: re }, { email: re }, { numero_etudiant: re }];
    }
    const users = await User.find(filter).sort({ role: 1, name: 1 });
    res.json(users.map(serializeUser));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── PUT /api/auth/users/:id ───────────────────────────────────────────────────
exports.updateUser = async (req, res) => {
  try {
    // never allow password update through this route
    const { password, ...updateData } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    res.json({ success: true, user: serializeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── DELETE /api/auth/users/:id ────────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    // prevent self-deletion
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Impossible de supprimer votre propre compte.' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    res.json({ success: true, message: 'Utilisateur supprimé.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── POST /api/auth/users/:id/reset-password  (admin) ─────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mot de passe : 6 caractères minimum.' });
    }
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Mot de passe réinitialisé.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── POST /api/auth/change-password  (self) ────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Champs obligatoires.' });
    }
    const user = await User.findById(req.user._id).select('+password');
    const ok   = await user.comparePassword(currentPassword);
    if (!ok) return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect.' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Mot de passe modifié.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── PUT /api/auth/profile ─────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, prenom, telephone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, prenom, telephone },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user: serializeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── stubs ─────────────────────────────────────────────────────────────────────
exports.logout              = (_req, res) => res.json({ success: true, message: 'Déconnecté.' });
exports.forgotPassword      = (_req, res) => res.json({ success: true, message: 'Email envoyé si le compte existe.' });
exports.resetPasswordByToken = (_req, res) => res.json({ success: true, message: 'Mot de passe réinitialisé.' });
exports.refreshToken = (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, token: generateToken(decoded.userId || decoded.id) });
  } catch {
    res.status(401).json({ success: false, message: 'Token invalide.' });
  }
};
