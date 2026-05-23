const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // ← single consistent import

const userSchema = new mongoose.Schema(
  {
    // Use 'name' everywhere (frontend uses name/prenom, not nom/prenom)
    name: { type: String, required: true, trim: true },
    prenom: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: ['admin', 'professeur', 'etudiant'],
      default: 'etudiant',
    },
    // Student-specific
    numero_etudiant: { type: String, sparse: true, trim: true },
    departement: { type: String, enum: ['GI', 'IDS', null], default: null },
    niveau: { type: String, enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', null], default: null },
    // Professor-specific
    specialization: { type: String, trim: true },
    // Common
    telephone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before saving (only if modified)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare candidate password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Never return password in JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
