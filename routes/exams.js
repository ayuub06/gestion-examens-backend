const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const { authMiddleware } = require('../middleware/auth');

// GET /exams — admin sees all
router.get('/', authMiddleware, async (req, res) => {
  try {
    const exams = await Exam.find({})
      .populate('salle', 'nom capacite')
      .populate('surveillant', 'name prenom')
      .sort({ date: 1, heure_debut: 1 });
    res.json({ exams });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /exams/my-exams — student sees only their dept + level
router.get('/my-exams', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'etudiant') {
      return res.status(403).json({ message: 'Students only' });
    }
    const exams = await Exam.find({
      department: req.user.departement,   // 'GI' or 'IDS'
      semester:   req.user.niveau,        // 'S1'...'S6'
    })
      .populate('salle', 'nom')
      .populate('surveillant', 'name prenom')
      .sort({ date: 1, heure_debut: 1 });
    res.json({ exams });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /exams/my-supervisions — professor sees only exams they supervise
router.get('/my-supervisions', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'professeur') {
      return res.status(403).json({ message: 'Professors only' });
    }
    const exams = await Exam.find({ surveillant: req.user._id })
      .populate('salle', 'nom')
      .sort({ date: 1, heure_debut: 1 });
    res.json({ exams });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;