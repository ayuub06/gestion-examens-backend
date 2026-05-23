const Exam = require('../models/Exam');
const User = require('../models/User');

const POPULATE = [
  { path: 'salle', select: 'nom capacite batiment etage type' },
  { path: 'surveillant', select: 'name prenom email specialization' },
  { path: 'surveillants_supplementaires', select: 'name prenom email' },
];

// ─── GET ALL (admin) ─────────────────────────────────────────────────────────
exports.getAllExams = async (req, res) => {
  try {
    const { department, semester, session, date, status } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (semester) filter.semester = semester;
    if (session) filter.session = session;
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      filter.date = {
        $gte: new Date(d.setHours(0, 0, 0, 0)),
        $lte: new Date(d.setHours(23, 59, 59, 999)),
      };
    }

    const exams = await Exam.find(filter).populate(POPULATE).sort({ date: 1, heure_debut: 1 });
    res.json({ success: true, count: exams.length, exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET MY EXAMS (student: by dept+niveau) ──────────────────────────────────
exports.getMyExams = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'etudiant') {
      return res.status(403).json({ success: false, message: 'Réservé aux étudiants.' });
    }
    const exams = await Exam.find({ department: user.departement, semester: user.niveau })
      .populate(POPULATE)
      .sort({ date: 1, heure_debut: 1 });
    res.json({ success: true, count: exams.length, exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET MY SUPERVISIONS (professor) ─────────────────────────────────────────
exports.getMySupervisions = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'professeur') {
      return res.status(403).json({ success: false, message: 'Réservé aux professeurs.' });
    }
    const exams = await Exam.find({
      $or: [{ surveillant: user._id }, { surveillants_supplementaires: user._id }],
    })
      .populate(POPULATE)
      .sort({ date: 1, heure_debut: 1 });
    res.json({ success: true, count: exams.length, exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ONE ─────────────────────────────────────────────────────────────────
exports.getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate(POPULATE)
      .populate({ path: 'etudiants', select: 'name prenom email numero_etudiant departement niveau' });
    if (!exam) return res.status(404).json({ success: false, message: 'Examen introuvable.' });
    res.json({ success: true, exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CREATE ──────────────────────────────────────────────────────────────────
exports.createExam = async (req, res) => {
  try {
    const { module, code_module, date, heure_debut, heure_fin, salle, surveillant, department, semester, session } = req.body;

    // Conflict checks
    const [roomConflict, profConflict] = await Promise.all([
      Exam.findOne({ salle, date: new Date(date) }).then((e) =>
        e && hasOverlap(heure_debut, heure_fin, e.heure_debut, e.heure_fin) ? e : null
      ),
      Exam.findOne({ surveillant, date: new Date(date) }).then((e) =>
        e && hasOverlap(heure_debut, heure_fin, e.heure_debut, e.heure_fin) ? e : null
      ),
    ]);

    if (roomConflict) return res.status(409).json({ success: false, message: 'Conflit de salle sur ce créneau.' });
    if (profConflict) return res.status(409).json({ success: false, message: 'Conflit de surveillant sur ce créneau.' });

    // Auto-assign students
    const students = await User.find({ role: 'etudiant', departement: department, niveau: semester }).select('_id');

    const exam = new Exam({
      module, code_module, date, heure_debut, heure_fin, salle, surveillant,
      department, semester, session: session || 'normale',
      etudiants: students.map((s) => s._id),
      nombre_etudiants: students.length,
    });
    await exam.save();
    await exam.populate(POPULATE);
    res.status(201).json({ success: true, exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate(POPULATE);
    if (!exam) return res.status(404).json({ success: false, message: 'Examen introuvable.' });
    res.json({ success: true, exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE ──────────────────────────────────────────────────────────────────
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Examen introuvable.' });
    res.json({ success: true, message: 'Examen supprimé.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ASSIGN / REMOVE STUDENT ─────────────────────────────────────────────────
exports.assignStudent = async (req, res) => {
  try {
    const { examId, studentId } = req.body;
    const exam = await Exam.findByIdAndUpdate(
      examId,
      { $addToSet: { etudiants: studentId } },
      { new: true }
    );
    if (!exam) return res.status(404).json({ success: false, message: 'Examen introuvable.' });
    res.json({ success: true, message: 'Étudiant ajouté.', exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeStudent = async (req, res) => {
  try {
    const { examId, studentId } = req.body;
    const exam = await Exam.findByIdAndUpdate(examId, { $pull: { etudiants: studentId } }, { new: true });
    if (!exam) return res.status(404).json({ success: false, message: 'Examen introuvable.' });
    res.json({ success: true, message: 'Étudiant retiré.', exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── BY STUDENT / PROFESSOR ──────────────────────────────────────────────────
exports.getStudentExams = async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Étudiant introuvable.' });
    const exams = await Exam.find({ department: student.departement, semester: student.niveau }).populate(POPULATE).sort({ date: 1 });
    res.json({ success: true, exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProfessorExams = async (req, res) => {
  try {
    const exams = await Exam.find({ surveillant: req.params.professorId }).populate(POPULATE).sort({ date: 1 });
    res.json({ success: true, exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── HELPER ──────────────────────────────────────────────────────────────────
function hasOverlap(s1, e1, s2, e2) {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  return toMin(s1) < toMin(e2) && toMin(e1) > toMin(s2);
}