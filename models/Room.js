const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  nom: { type: String, required: true, unique: true, trim: true },
  capacite: { type: Number, required: true, min: 1 },
  batiment: { type: String, required: true, trim: true },
  etage: { type: Number, required: true, min: 0 },
  type: {
    type: String,
    enum: ['amphi', 'grande_salle', 'petite_salle', 'labo'],
    required: true,
  },
  equipements: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Helper : how many supervisors this room type requires
roomSchema.virtual('surveillantsRequis').get(function () {
  const map = { amphi: 3, grande_salle: 2, petite_salle: 1, labo: 1 };
  return map[this.type] || 1;
});

roomSchema.index({ type: 1 });
roomSchema.index({ isActive: 1 });

module.exports = mongoose.model('Room', roomSchema);
