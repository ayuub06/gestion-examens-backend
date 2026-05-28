const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  code:  { type: String, required: true, unique: true, uppercase: true, trim: true },
  department: {
    type: String,
    enum: ['GI','IDS','BigData','GC','GE','GM','TM','IG','COMMON'],
    required: true,
  },
  semester: {
    type: String,
    enum: ['S1','S2','S3','S4','S5','S6'],
    required: true,
  },
  niveau: {
    type: String,
    enum: ['DUT1','DUT2','Bachelor'],
  },
  professor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  credits:  { type: Number, default: 3 },
  hours:    { type: Number, default: 30 },
  examType: {
    type: String,
    enum: ['theorique','pratique'],
    default: 'theorique',
  },
}, { timestamps: true });

moduleSchema.index({ department: 1, semester: 1 });

module.exports = mongoose.model('Module', moduleSchema);
