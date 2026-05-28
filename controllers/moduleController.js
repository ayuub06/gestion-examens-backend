const Module = require('../models/Module');

exports.getAllModules = async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.semester)   filter.semester   = req.query.semester;
    if (req.query.professor)  filter.professor  = req.query.professor;

    const modules = await Module.find(filter)
      .populate('professor', 'name prenom email specialization')
      .sort({ department: 1, semester: 1, code: 1 });

    res.json({ success: true, modules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getModuleById = async (req, res) => {
  try {
    const mod = await Module.findById(req.params.id).populate('professor', 'name prenom email');
    if (!mod) return res.status(404).json({ success: false, message: 'Module introuvable.' });
    res.json({ success: true, module: mod });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createModule = async (req, res) => {
  try {
    const mod = new Module(req.body);
    await mod.save();
    const populated = await Module.findById(mod._id).populate('professor', 'name prenom email');
    res.status(201).json({ success: true, module: populated });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Code module déjà utilisé.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const mod = await Module.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('professor', 'name prenom email');
    if (!mod) return res.status(404).json({ success: false, message: 'Module introuvable.' });
    res.json({ success: true, module: mod });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const mod = await Module.findByIdAndDelete(req.params.id);
    if (!mod) return res.status(404).json({ success: false, message: 'Module introuvable.' });
    res.json({ success: true, message: 'Module supprimé.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
