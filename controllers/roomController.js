const Room = require('../models/Room');
const Exam = require('../models/Exam');

exports.getAllRooms = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.type) filter.type = req.query.type;
    const rooms = await Room.find(filter).sort({ type: 1, nom: 1 });
    res.json({ success: true, rooms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Salle introuvable.' });
    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.status(201).json({ success: true, room });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Ce nom de salle existe déjà.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!room) return res.status(404).json({ success: false, message: 'Salle introuvable.' });
    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    // soft delete: set isActive = false
    const room = await Room.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!room) return res.status(404).json({ success: false, message: 'Salle introuvable.' });
    res.json({ success: true, message: 'Salle désactivée.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rooms/:id/availability?date=2025-01-03
exports.getRoomAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Paramètre date requis.' });

    const exams = await Exam.find({
      salle: req.params.id,
      date: { $gte: new Date(date), $lt: new Date(new Date(date).getTime() + 86400000) },
    }).select('heure_debut heure_fin module');

    const TIME_SLOTS = ['08:00','10:30','14:00','16:30'];
    const availability = TIME_SLOTS.map(start => ({
      start,
      busy: exams.some(e => e.heure_debut === start),
      exam: exams.find(e => e.heure_debut === start) || null,
    }));

    res.json({ success: true, date, availability });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
