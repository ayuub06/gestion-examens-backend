const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    department: {
      type: String,
      enum: ['GI', 'IDS', 'BigData', 'COMMON'],
      required: true,
    },
    semester: {
      type: String,
      enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
      required: true,
    },
    professor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hours: { type: Number, default: 30 },
    credits: { type: Number, default: 3 },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

moduleSchema.index({ department: 1, semester: 1 });

module.exports = mongoose.model('Module', moduleSchema);
