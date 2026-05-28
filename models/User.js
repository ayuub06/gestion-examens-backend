const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:   { type: String, required: true, trim: true },
  prenom: { type: String, required: true, trim: true },
  email: {
    type: String, required: true, unique: true,
    lowercase: true, trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
  },
  password: { type: String, required: true, minlength: 6, select: false },
  role: {
    type: String,
    enum: ['admin', 'professeur', 'etudiant'],
    default: 'etudiant',
  },

  // ── étudiant ──────────────────────────────────────────────────────────────
  numero_etudiant: { type: String, sparse: true, trim: true },
  departement: {
    type: String,
    enum: [
      'GI',       // Génie Informatique
      'IDS',      // Informatique Décisionnelle & Big Data
      'BigData',  // Big Data (Bachelor)
      'GC',       // Génie Civil
      'GE',       // Génie Électrique
      'GM',       // Génie Mécanique
      'TM',       // Techniques de Management
      'IG',       // Informatique de Gestion
      null,
    ],
  },
  niveau: {
    type: String,
    enum: ['DUT1', 'DUT2', 'Bachelor', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', null],
  },

  // ── professeur ────────────────────────────────────────────────────────────
  specialization: { type: String, trim: true },
  telephone:      { type: String, trim: true },

  // ── commun ────────────────────────────────────────────────────────────────
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ── Hash password ─────────────────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try { this.password = await bcrypt.hash(this.password, 12); next(); }
  catch (err) { next(err); }
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.virtual('fullName').get(function () {
  return `${this.name} ${this.prenom}`;
});

userSchema.index({ role: 1 });
userSchema.index({ departement: 1, niveau: 1 });

module.exports = mongoose.model('User', userSchema);
