const mongoose = require('mongoose');
const Exam = require('./models/Exam');
const User = require('./models/User');
const Room = require('./models/Room');

mongoose.connect('mongodb://localhost:27017/gestion_examens');

async function createExams() {
  // Récupérer les données
  const professor = await User.findOne({ role: 'professeur' });
  const student = await User.findOne({ role: 'etudiant' });
  const room = await Room.findOne();
  
  console.log('👨‍🏫 Professeur:', professor?.email);
  console.log('👨‍🎓 Étudiant:', student?.email);
  console.log('🏫 Salle:', room?.nom);
  
  if (!room) {
    console.error('❌ Aucune salle trouvée!');
    process.exit();
  }
  
  const exams = [
    {
      module: 'Algorithmique Avancée',
      code_module: 'GI301',
      date: new Date('2025-01-03'),
      heure_debut: '08:00',
      heure_fin: '10:00',
      salle: room._id,
      surveillant: professor?._id || null,
      etudiants: student ? [student._id] : [],
      department: 'GI',
      semester: 'S3',
      type: 'exam',
      nombre_etudiants: 30
    },
    {
      module: 'Base de Données',
      code_module: 'GI302',
      date: new Date('2025-01-05'),
      heure_debut: '14:00',
      heure_fin: '16:00',
      salle: room._id,
      surveillant: professor?._id || null,
      etudiants: student ? [student._id] : [],
      department: 'GI',
      semester: 'S3',
      type: 'exam',
      nombre_etudiants: 30
    },
    {
      module: 'Programmation Web',
      code_module: 'GI303',
      date: new Date('2025-01-07'),
      heure_debut: '10:30',
      heure_fin: '12:30',
      salle: room._id,
      surveillant: professor?._id || null,
      etudiants: student ? [student._id] : [],
      department: 'GI',
      semester: 'S3',
      type: 'exam',
      nombre_etudiants: 30
    }
  ];
  
  for (const exam of exams) {
    try {
      const newExam = new Exam(exam);
      await newExam.save();
      console.log(`✅ Examen créé: ${exam.module}`);
    } catch (err) {
      console.error(`❌ Erreur: ${err.message}`);
    }
  }
  
  const count = await Exam.countDocuments();
  console.log(`\n📚 Total examens: ${count}`);
  process.exit();
}

createExams();
