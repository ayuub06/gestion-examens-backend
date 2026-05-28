const Exam   = require('../models/Exam');
const User   = require('../models/User');
const Room   = require('../models/Room');
const Module = require('../models/Module');

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalStudents, totalProfessors, totalRooms, totalModules, totalExams,
      examsBySession, examsByDept, examsByProf, roomUsage,
    ] = await Promise.all([
      User.countDocuments({ role: 'etudiant' }),
      User.countDocuments({ role: 'professeur' }),
      Room.countDocuments({ isActive: true }),
      Module.countDocuments(),
      Exam.countDocuments(),
      Exam.aggregate([{ $group: { _id: '$session', count: { $sum: 1 } } }]),
      Exam.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }]),
      Exam.aggregate([
        { $group: { _id: '$surveillant', count: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'prof' } },
        { $unwind: { path: '$prof', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $concat: ['$prof.name', ' ', '$prof.prenom'] }, count: 1 } },
        { $sort: { count: -1 } },
      ]),
      Room.aggregate([
        { $lookup: { from: 'exams', localField: '_id', foreignField: 'salle', as: 'exams' } },
        { $project: { nom: 1, type: 1, capacite: 1, examCount: { $size: '$exams' } } },
        { $sort: { examCount: -1 } },
      ]),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayExams = await Exam.find({
      date: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
    }).populate('salle', 'nom').populate('surveillant', 'name prenom').sort({ heure_debut: 1 });

    res.json({
      success: true,
      stats: {
        users: { total: totalStudents + totalProfessors, students: totalStudents, professors: totalProfessors },
        rooms: totalRooms,
        modules: totalModules,
        exams: { total: totalExams, bySession: examsBySession, byDepartment: examsByDept },
        professors: examsByProf,
        roomUsage,
        todayExams,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
