const Room = require('../models/Room');
const Exam = require('../models/Exam');

// ─── GET ALL ─────────────────────────────────────────────────────────────────
exports.getAllRooms = async (req, res) => {
  try {
    const { type, isActive } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const rooms = await Room.find(filter).sort({ batiment: 1, nom: 1 });
    res.json({ success: true, count: rooms.length, rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ONE ─────────────────────────────────────────────────────────────────
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Salle introuvable.' });
    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CREATE ──────────────────────────────────────────────────────────────────
exports.createRoom = async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.status(201).json({ success: true, room });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Une salle avec ce nom existe déjà.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!room) return res.status(404).json({ success: false, message: 'Salle introuvable.' });
    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE ──────────────────────────────────────────────────────────────────
exports.deleteRoom = async (req, res) => {
  try {
    // Check if room has future exams
    const futureExam = await Exam.findOne({ salle: req.params.id, date: { $gte: new Date() } });
    if (futureExam) {
      return res.status(400).json({ success: false, message: 'Impossible de supprimer: la salle a des examens planifiés.' });
    }
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Salle introuvable.' });
    res.json({ success: true, message: 'Salle supprimée.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CHECK AVAILABILITY ──────────────────────────────────────────────────────
exports.checkAvailability = async (req, res) => {
  try {
    const { date, heure_debut, heure_fin } = req.query;
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

    const rooms = await Room.find({ isActive: true });
    const examsOnDate = await Exam.find({ date: new Date(date) });

    const availability = rooms.map((room) => {
      const conflicts = examsOnDate.filter(
        (e) => e.salle.toString() === room._id.toString() &&
          toMin(heure_debut) < toMin(e.heure_fin) &&
          toMin(heure_fin) > toMin(e.heure_debut)
      );
      return { ...room.toObject(), available: conflicts.length === 0, conflicts };
    });

    res.json({ success: true, rooms: availability });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ROOM EXAMS ──────────────────────────────────────────────────────────
exports.getRoomExams = async (req, res) => {
  try {
    const exams = await Exam.find({ salle: req.params.id })
      .populate('surveillant', 'name prenom')
      .sort({ date: 1, heure_debut: 1 });
    res.json({ success: true, exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};