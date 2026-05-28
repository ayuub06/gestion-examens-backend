const mongoose = require('mongoose');
const Exam = require('../models/Exam');

// Map student niveau → which semesters their exams belong to
const NIVEAU_TO_SEMS = {
  DUT1:    ['S1','S2'],
  DUT2:    ['S3','S4'],
  Bachelor:['S5','S6'],
  // legacy fallbacks
  S1:['S1'], S2:['S2'], S3:['S3'], S4:['S4'], S5:['S5'], S6:['S6'],
};

const populate = q =>
  q.populate('salle',       'nom capacite batiment type')
   .populate('surveillant', 'name prenom email specialization')
   .populate('surveillants','name prenom email')
   .populate('etudiants',   'name prenom email numero_etudiant departement niveau');

// ── GET /api/exams  (admin) ───────────────────────────────────────────────────
exports.getAllExams = async (req, res) => {
  try {
    const filter = {};
    if (req.query.session)    filter.session    = req.query.session;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.semester)   filter.semester   = req.query.semester;

    const exams = await populate(Exam.find(filter).sort({ date:1, heure_debut:1 }));
    res.json({ success:true, total:exams.length, exams });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── GET /api/exams/my-exams  (étudiant) ───────────────────────────────────────
exports.getMyExams = async (req, res) => {
  try {
    const u = req.user;

    // Map this student's niveau to the semesters whose exams they attend
    const semesters = NIVEAU_TO_SEMS[u.niveau] || [];

    const query = {
      $or: [
        // Primary: student is explicitly listed
        { etudiants: u._id },
        // Fallback: exam is for their dept + matching semesters
        ...(u.departement && semesters.length ? [{
          department: u.departement,
          semester:   { $in: semesters },
        }] : []),
        // Also match COMMON modules at their niveau
        ...(semesters.length ? [{
          department: 'COMMON',
          semester:   { $in: semesters },
        }] : []),
      ],
    };

    const exams = await populate(Exam.find(query).sort({ date:1, heure_debut:1 }));
    res.json({ success:true, exams });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── GET /api/exams/my-supervisions  (professeur) ──────────────────────────────
exports.getMySupervisions = async (req, res) => {
  try {
    const id = req.user._id;
    const exams = await populate(
      Exam.find({
        $or: [
          { surveillant:  id },
          { surveillants: id },
        ],
      }).sort({ date:1, heure_debut:1 })
    );
    res.json({ success:true, exams });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── GET /api/exams/:id ─────────────────────────────────────────────────────────
exports.getExamById = async (req, res) => {
  try {
    const exam = await populate(Exam.findById(req.params.id));
    if (!exam) return res.status(404).json({ success:false, message:'Examen introuvable.' });
    res.json({ success:true, exam });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── POST /api/exams  (admin) ───────────────────────────────────────────────────
exports.createExam = async (req, res) => {
  try {
    const exam = new Exam(req.body);
    await exam.save();
    const populated = await populate(Exam.findById(exam._id));
    res.status(201).json({ success:true, exam:populated });
  } catch(e) {
    if(e.code===11000) return res.status(409).json({ success:false, message:'Créneau/salle déjà pris.' });
    res.status(500).json({ success:false, message:e.message });
  }
};

// ── PUT /api/exams/:id ─────────────────────────────────────────────────────────
exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new:true });
    if (!exam) return res.status(404).json({ success:false, message:'Examen introuvable.' });
    res.json({ success:true, exam });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── DELETE /api/exams/:id ──────────────────────────────────────────────────────
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ success:false, message:'Examen introuvable.' });
    res.json({ success:true, message:'Examen supprimé.' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── POST /api/exams/:id/assign-student ────────────────────────────────────────
exports.assignStudent = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { etudiants: req.body.studentId } },
      { new:true }
    );
    res.json({ success:true, exam });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── DELETE /api/exams/:id/remove-student ──────────────────────────────────────
exports.removeStudent = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { $pull: { etudiants: req.body.studentId } },
      { new:true }
    );
    res.json({ success:true, exam });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── GET /api/exams/student/:studentId ─────────────────────────────────────────
exports.getStudentExams = async (req, res) => {
  try {
    const student = await require('../models/User').findById(req.params.studentId);
    const semesters = NIVEAU_TO_SEMS[student?.niveau] || [];
    const exams = await populate(Exam.find({
      $or:[
        { etudiants: req.params.studentId },
        ...(student?.departement && semesters.length ? [{ department:student.departement, semester:{$in:semesters} }] : []),
      ]
    }).sort({date:1}));
    res.json({ success:true, exams });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── GET /api/exams/professor/:professorId ─────────────────────────────────────
exports.getProfessorExams = async (req, res) => {
  try {
    const exams = await populate(Exam.find({
      $or:[{surveillant:req.params.professorId},{surveillants:req.params.professorId}]
    }).sort({date:1}));
    res.json({ success:true, exams });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};