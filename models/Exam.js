const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  module:       { type: String, required: true },
  code_module:  { type: String, required: true },
  date:         { type: Date,   required: true },
  heure_debut:  { type: String, required: true },
  heure_fin:    { type: String, required: true },

  salle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },

  surveillant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  surveillants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  etudiants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  department:       { type: String, enum: ['GI','IDS','BigData','GC','GE','GM','TM','IG','COMMON'], required: true },
  semester:         { type: String, enum: ['S1','S2','S3','S4','S5','S6'], required: true },
  session:          { type: String, enum: ['normale','rattrapage'], default: 'normale' },
  type:             { type: String, enum: ['exam','quiz','final','midterm'], default: 'exam' },
  nombre_etudiants: { type: Number, default: 0 },

  notes: [{
    etudiant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note:     { type: Number, min: 0, max: 20 },
    present:  { type: Boolean, default: false },
  }],

  status: {
    type: String,
    enum: ['scheduled','ongoing','completed','cancelled'],
    default: 'scheduled',
  },
}, { timestamps: true });

// ─── INDEXES ───────────────────────────────────────────────────────────────────
// Unique constraint prevents double-booking even under concurrent requests (Vercel retries).
// The scheduler handles E11000 by syncing in-memory state and trying the next slot.
examSchema.index({ date: 1, heure_debut: 1, salle: 1 }, { unique: true });
examSchema.index({ surveillant: 1, date: 1 });
examSchema.index({ department: 1, semester: 1 });
examSchema.index({ session: 1 });
examSchema.index({ etudiants: 1 });

module.exports = mongoose.model('Exam', examSchema);