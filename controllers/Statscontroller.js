const Exam = require('../models/Exam');
const User = require('../models/User');
const Room = require('../models/Room');
const Module = require('../models/Module');

exports.getStats = async (req, res) => {
  try {
    const [totalStudents, totalProfessors, totalAdmins, totalRooms, totalModules, totalExams] = await Promise.all([
      User.countDocuments({ role: 'etudiant' }),
      User.countDocuments({ role: 'professeur' }),
      User.countDocuments({ role: 'admin' }),
      Room.countDocuments({}),
      Module.countDocuments({}),
      Exam.countDocuments({}),
    ]);

    // Exams today
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    const examsToday = await Exam.countDocuments({ date: { $gte: todayStart, $lte: todayEnd } });

    // Exams by department
    const byDept = await Exam.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }]);

    // Exams by session
    const bySession = await Exam.aggregate([{ $group: { _id: '$session', count: { $sum: 1 } } }]);

    // Professor workload
    const profWorkload = await Exam.aggregate([
      { $group: { _id: '$surveillant', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'prof' } },
      { $unwind: '$prof' },
      { $project: { name: { $concat: ['$prof.name', ' ', '$prof.prenom'] }, count: 1 } },
      { $sort: { count: -1 } },
    ]);

    // Room occupation rate
    const roomOccupation = await Exam.aggregate([
      { $group: { _id: '$salle', count: { $sum: 1 } } },
      { $lookup: { from: 'rooms', localField: '_id', foreignField: '_id', as: 'room' } },
      { $unwind: '$room' },
      { $project: { name: '$room.nom', capacity: '$room.capacite', examCount: '$count' } },
      { $sort: { examCount: -1 } },
    ]);

    res.json({
      success: true,
      stats: {
        users: { total: totalStudents + totalProfessors + totalAdmins, students: totalStudents, professors: totalProfessors, admins: totalAdmins },
        rooms: totalRooms,
        modules: totalModules,
        exams: { total: totalExams, today: examsToday, byDepartment: byDept, bySession },
        professorWorkload: profWorkload,
        roomOccupation,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};