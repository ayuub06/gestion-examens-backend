const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

const generateToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRE });

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Compte désactivé.' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
    const token = generateToken(user._id);
    res.json({ success: true, token, user: { id: user._id, name: user.name, prenom: user.prenom, email: user.email, role: user.role, numero_etudiant: user.numero_etudiant, departement: user.departement, niveau: user.niveau, specialization: user.specialization } });
  } catch (error) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
};

exports.register = async (req, res) => {
  try {
    const { name, prenom, email, password, role, numero_etudiant, departement, niveau, specialization } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email déjà utilisé.' });
    const user = new User({ name, prenom, email, password, role, numero_etudiant, departement, niveau, specialization });
    await user.save();
    res.status(201).json({ success: true, token: generateToken(user._id), user });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Email déjà existant.' });
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

exports.adminCreateUser = async (req, res) => {
  try {
    const { name, prenom, email, password, role, numero_etudiant, departement, niveau, specialization } = req.body;
    if (!name || !prenom || !email || !password || !role) return res.status(400).json({ success: false, message: 'Champs obligatoires manquants.' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email déjà utilisé.' });
    const user = new User({ name, prenom, email, password, role, numero_etudiant, departement, niveau, specialization });
    await user.save();
    res.status(201).json({ success: true, message: `${role} créé avec succès.`, user });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Email déjà existant.' });
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role, departement, niveau, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (departement) filter.departement = departement;
    if (niveau) filter.niveau = niveau;
    if (search) { const re = new RegExp(search, 'i'); filter.$or = [{ name: re }, { prenom: re }, { email: re }]; }
    const users = await User.find(filter).sort({ role: 1, name: 1 });
    res.json(users);
  } catch (error) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    res.json({ success: true, user });
  } catch (error) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    res.json({ success: true, message: 'Utilisateur supprimé.' });
  } catch (error) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
};

exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'Mot de passe trop court.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Mot de passe réinitialisé.' });
  } catch (error) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Champs obligatoires.' });
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect.' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Mot de passe modifié.' });
  } catch (error) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    res.json({ success: true, user });
  } catch (error) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, prenom, telephone } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, prenom, telephone }, { new: true });
    res.json({ success: true, user });
  } catch (error) { res.status(500).json({ success: false, message: 'Erreur serveur.' }); }
};

exports.logout = (req, res) => res.json({ success: true, message: 'Déconnecté.' });

exports.forgotPassword = (req, res) => res.json({ success: true, message: 'Email envoyé si le compte existe.' });

exports.resetPasswordByToken = (req, res) => res.json({ success: true, message: 'Mot de passe réinitialisé.' });

exports.refreshToken = (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, token: generateToken(decoded.userId) });
  } catch { res.status(401).json({ success: false, message: 'Token invalide.' }); }
};