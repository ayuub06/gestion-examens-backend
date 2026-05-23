const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    module: { type: String, required: true },
    code_module: { type: String, required: true },
    date: { type: Date, required: true },
    heure_debut: { type: String, required: true },
    heure_fin: { type: String, required: true },
    salle: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    surveillant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    surveillants_supplementaires: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    etudiants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    department: { type: String, required: true },
    semester: { type: String, required: true },
    session: { type: String, enum: ['normale', 'rattrapage'], default: 'normale' },
    type: { type: String, enum: ['exam', 'rattrapage', 'tp'], default: 'exam' },
    nombre_etudiants: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

// Index for conflict detection queries
examSchema.index({ date: 1, salle: 1 });
examSchema.index({ date: 1, surveillant: 1 });
examSchema.index({ department: 1, semester: 1 });

module.exports = mongoose.model('Exam', examSchema);
