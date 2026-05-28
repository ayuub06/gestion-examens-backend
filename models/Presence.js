const mongoose = require('mongoose');

const presenceSchema = new mongoose.Schema({
  exam:     { type: mongoose.Schema.Types.ObjectId, ref: 'Exam',  required: true },
  etudiant: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  present:  { type: Boolean, default: false },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  markedAt: { type: Date },
  note:     { type: Number, min: 0, max: 20 },
}, { timestamps: true });

presenceSchema.index({ exam: 1, etudiant: 1 }, { unique: true });

module.exports = mongoose.model('Presence', presenceSchema);
