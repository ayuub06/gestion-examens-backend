const Module = require('../models/Module');

// ─── GET ALL ─────────────────────────────────────────────────────────────────
exports.getAllModules = async (req, res) => {
  try {
    const { department, semester, professor } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (semester) filter.semester = semester;
    if (professor) filter.professor = professor;

    const modules = await Module.find(filter)
      .populate('professor', 'name prenom email specialization')
      .sort({ department: 1, semester: 1, code: 1 });
    res.json({ success: true, count: modules.length, modules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ONE ─────────────────────────────────────────────────────────────────
exports.getModuleById = async (req, res) => {
  try {
    const module = await Module.findById(req.params.id).populate('professor', 'name prenom email');
    if (!module) return res.status(404).json({ success: false, message: 'Module introuvable.' });
    res.json({ success: true, module });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CREATE ──────────────────────────────────────────────────────────────────
exports.createModule = async (req, res) => {
  try {
    const module = new Module(req.body);
    await module.save();
    await module.populate('professor', 'name prenom email specialization');
    res.status(201).json({ success: true, module });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Un module avec ce code existe déjà.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
exports.updateModule = async (req, res) => {
  try {
    const module = await Module.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('professor', 'name prenom email specialization');
    if (!module) return res.status(404).json({ success: false, message: 'Module introuvable.' });
    res.json({ success: true, module });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE ──────────────────────────────────────────────────────────────────
exports.deleteModule = async (req, res) => {
  try {
    const module = await Module.findByIdAndDelete(req.params.id);
    if (!module) return res.status(404).json({ success: false, message: 'Module introuvable.' });
    res.json({ success: true, message: 'Module supprimé.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};