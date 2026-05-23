const mongoose = require('mongoose');

const presenceSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    etudiant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    present: { type: Boolean, default: false },
    heure_arrivee: { type: String },
    observations: { type: String },
    enregistre_par: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

presenceSchema.index({ exam: 1, etudiant: 1 }, { unique: true });

module.exports = mongoose.model('Presence', presenceSchema);
