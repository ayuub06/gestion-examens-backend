const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, unique: true, trim: true },
    capacite: { type: Number, required: true, min: 1 },
    batiment: { type: String, required: true, trim: true },
    etage: { type: Number, required: true, min: 0 },
    // 'amphi' | 'grande_salle' | 'petite_salle' | 'informatique'
    type: {
      type: String,
      enum: ['amphi', 'grande_salle', 'petite_salle', 'informatique'],
      default: 'petite_salle',
    },
    surveillants_requis: { type: Number, default: 1 },
    equipements: [{ type: String }],
    isActive: { type: Boolean, default: true }, // ← was missing, broke scheduling
  },
  { timestamps: true }
);

// Auto-compute surveillants_requis and type from capacity / name
roomSchema.pre('save', function (next) {
  const n = this.nom.toLowerCase();
  if (n.includes('amphi')) {
    this.type = 'amphi';
    this.surveillants_requis = 3;
  } else if (n.includes('labo') || n.includes('info')) {
    this.type = 'informatique';
    this.surveillants_requis = 1;
  } else if (this.capacite >= 70) {
    this.type = 'grande_salle';
    this.surveillants_requis = 2;
  } else {
    this.type = 'petite_salle';
    this.surveillants_requis = 1;
  }
  next();
});

module.exports = mongoose.model('Room', roomSchema);
