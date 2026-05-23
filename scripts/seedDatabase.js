const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const Room = require('../models/Room');
const Module = require('../models/Module');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/university_exam_db';

// ─── DATA ────────────────────────────────────────────────────────────────────
const admins = [
  { name: 'Imourigue', prenom: 'Ayoub', email: 'ayoub.imourigue@admin.uca.ma', password: 'admin123', role: 'admin' },
  { name: 'Elkadiri',  prenom: 'Yassine', email: 'yassine.elkadiri@admin.uca.ma', password: 'admin123', role: 'admin' },
];

const professors = [
  { name: 'Regragui',    prenom: 'Youness',        email: 'youness.regragui@uca.ma',       password: 'prof123', role: 'professeur', specialization: 'Réseaux & Sécurité' },
  { name: 'Amine',       prenom: 'Abdellah',        email: 'abdellah.amine@uca.ma',         password: 'prof123', role: 'professeur', specialization: 'Intelligence Artificielle' },
  { name: 'Hammime',     prenom: 'Mohammed',        email: 'mohammed.hammime@uca.ma',       password: 'prof123', role: 'professeur', specialization: 'Génie Logiciel' },
  { name: 'Ait Daoud',   prenom: 'Rachid',          email: 'rachid.aitdaoud@uca.ma',        password: 'prof123', role: 'professeur', specialization: 'Mathématiques' },
  { name: 'Fauzi',       prenom: 'Hassan',          email: 'hassan.fauzi@uca.ma',           password: 'prof123', role: 'professeur', specialization: 'Algorithmique' },
  { name: 'Ichrak',      prenom: 'Fatimaezzahra',   email: 'fatimaezzahra.ichrak@uca.ma',   password: 'prof123', role: 'professeur', specialization: 'Data Science' },
  { name: 'Benjelloun',  prenom: 'Karim',           email: 'karim.benjelloun@uca.ma',       password: 'prof123', role: 'professeur', specialization: 'Base de Données' },
  { name: 'El Mansouri', prenom: 'Sara',            email: 'sara.elmansouri@uca.ma',        password: 'prof123', role: 'professeur', specialization: 'Cloud Computing' },
  { name: 'Tazi',        prenom: 'Mehdi',           email: 'mehdi.tazi@uca.ma',             password: 'prof123', role: 'professeur', specialization: 'Développement Mobile' },
  { name: 'Alaoui',      prenom: 'Leila',           email: 'leila.alaoui@uca.ma',           password: 'prof123', role: 'professeur', specialization: 'Soft Skills' },
];

const roomsData = [
  // Amphithéâtres (3)
  { nom: 'Amphi A', capacite: 150, batiment: 'Principal', etage: 0 },
  { nom: 'Amphi B', capacite: 150, batiment: 'Principal', etage: 0 },
  { nom: 'Amphi C', capacite: 150, batiment: 'Principal', etage: 0 },
  // Grandes salles (6)
  { nom: 'A101', capacite: 80, batiment: 'A', etage: 1 },
  { nom: 'A102', capacite: 80, batiment: 'A', etage: 1 },
  { nom: 'B101', capacite: 80, batiment: 'B', etage: 1 },
  { nom: 'B102', capacite: 80, batiment: 'B', etage: 1 },
  { nom: 'C101', capacite: 80, batiment: 'C', etage: 1 },
  { nom: 'C102', capacite: 80, batiment: 'C', etage: 1 },
  // Petites salles (10)
  { nom: 'A201', capacite: 40, batiment: 'A', etage: 2 },
  { nom: 'A202', capacite: 40, batiment: 'A', etage: 2 },
  { nom: 'B201', capacite: 40, batiment: 'B', etage: 2 },
  { nom: 'B202', capacite: 40, batiment: 'B', etage: 2 },
  { nom: 'C201', capacite: 40, batiment: 'C', etage: 2 },
  { nom: 'C202', capacite: 40, batiment: 'C', etage: 2 },
  { nom: 'D101', capacite: 40, batiment: 'D', etage: 1 },
  { nom: 'D102', capacite: 40, batiment: 'D', etage: 1 },
  { nom: 'E101', capacite: 40, batiment: 'E', etage: 1 },
  { nom: 'E102', capacite: 40, batiment: 'E', etage: 1 },
  // Salles informatiques (4)
  { nom: 'Labo 1', capacite: 30, batiment: 'Informatique', etage: 0 },
  { nom: 'Labo 2', capacite: 30, batiment: 'Informatique', etage: 0 },
  { nom: 'Labo 3', capacite: 30, batiment: 'Informatique', etage: 0 },
  { nom: 'Labo 4', capacite: 30, batiment: 'Informatique', etage: 0 },
];

// Modules definition (will be linked to professor IDs after creation)
const modulesTemplate = [
  // GI - S1
  { name: 'Algorithmique et Structures de Données', code: 'GI-S1-ALG', department: 'GI', semester: 'S1', profEmail: 'hassan.fauzi@uca.ma' },
  { name: 'Programmation Orientée Objet', code: 'GI-S1-POO', department: 'GI', semester: 'S1', profEmail: 'mohammed.hammime@uca.ma' },
  { name: 'Mathématiques Discrètes', code: 'GI-S1-MATH', department: 'GI', semester: 'S1', profEmail: 'rachid.aitdaoud@uca.ma' },
  { name: 'Réseaux Informatiques', code: 'GI-S1-RES', department: 'GI', semester: 'S1', profEmail: 'youness.regragui@uca.ma' },
  // GI - S2
  { name: 'Base de Données', code: 'GI-S2-BD', department: 'GI', semester: 'S2', profEmail: 'karim.benjelloun@uca.ma' },
  { name: 'Développement Web', code: 'GI-S2-WEB', department: 'GI', semester: 'S2', profEmail: 'mohammed.hammime@uca.ma' },
  { name: 'Systèmes d\'Exploitation', code: 'GI-S2-SE', department: 'GI', semester: 'S2', profEmail: 'youness.regragui@uca.ma' },
  { name: 'Communication Professionnelle', code: 'GI-S2-COM', department: 'GI', semester: 'S2', profEmail: 'leila.alaoui@uca.ma' },
  // GI - S3
  { name: 'Intelligence Artificielle', code: 'GI-S3-IA', department: 'GI', semester: 'S3', profEmail: 'abdellah.amine@uca.ma' },
  { name: 'Sécurité Informatique', code: 'GI-S3-SEC', department: 'GI', semester: 'S3', profEmail: 'youness.regragui@uca.ma' },
  { name: 'Développement Mobile', code: 'GI-S3-MOB', department: 'GI', semester: 'S3', profEmail: 'mehdi.tazi@uca.ma' },
  // GI - S4
  { name: 'Cloud Computing', code: 'GI-S4-CLOUD', department: 'GI', semester: 'S4', profEmail: 'sara.elmansouri@uca.ma' },
  { name: 'Big Data', code: 'GI-S4-BD2', department: 'GI', semester: 'S4', profEmail: 'fatimaezzahra.ichrak@uca.ma' },
  { name: 'Génie Logiciel Avancé', code: 'GI-S4-GL', department: 'GI', semester: 'S4', profEmail: 'mohammed.hammime@uca.ma' },
  // GI - S5
  { name: 'Machine Learning', code: 'GI-S5-ML', department: 'GI', semester: 'S5', profEmail: 'abdellah.amine@uca.ma' },
  { name: 'Architecture Microservices', code: 'GI-S5-ARCH', department: 'GI', semester: 'S5', profEmail: 'sara.elmansouri@uca.ma' },
  // GI - S6
  { name: 'Projet de Fin d\'Études', code: 'GI-S6-PFE', department: 'GI', semester: 'S6', profEmail: 'mohammed.hammime@uca.ma' },
  { name: 'Entrepreneuriat', code: 'GI-S6-ENT', department: 'GI', semester: 'S6', profEmail: 'leila.alaoui@uca.ma' },
  // IDS - S1
  { name: 'Statistiques et Probabilités', code: 'IDS-S1-STAT', department: 'IDS', semester: 'S1', profEmail: 'rachid.aitdaoud@uca.ma' },
  { name: 'Introduction au Data Science', code: 'IDS-S1-DS', department: 'IDS', semester: 'S1', profEmail: 'fatimaezzahra.ichrak@uca.ma' },
  { name: 'Python pour la Data', code: 'IDS-S1-PY', department: 'IDS', semester: 'S1', profEmail: 'hassan.fauzi@uca.ma' },
  // IDS - S2
  { name: 'Machine Learning Fondamentaux', code: 'IDS-S2-ML', department: 'IDS', semester: 'S2', profEmail: 'abdellah.amine@uca.ma' },
  { name: 'Visualisation de Données', code: 'IDS-S2-VIZ', department: 'IDS', semester: 'S2', profEmail: 'fatimaezzahra.ichrak@uca.ma' },
  { name: 'Base de Données NoSQL', code: 'IDS-S2-NOSQL', department: 'IDS', semester: 'S2', profEmail: 'karim.benjelloun@uca.ma' },
  // IDS - S3
  { name: 'Deep Learning', code: 'IDS-S3-DL', department: 'IDS', semester: 'S3', profEmail: 'abdellah.amine@uca.ma' },
  { name: 'Traitement du Langage Naturel', code: 'IDS-S3-NLP', department: 'IDS', semester: 'S3', profEmail: 'fatimaezzahra.ichrak@uca.ma' },
  // IDS - S4
  { name: 'Big Data Analytics', code: 'IDS-S4-BDA', department: 'IDS', semester: 'S4', profEmail: 'fatimaezzahra.ichrak@uca.ma' },
  { name: 'Business Intelligence', code: 'IDS-S4-BI', department: 'IDS', semester: 'S4', profEmail: 'karim.benjelloun@uca.ma' },
  // IDS - S5
  { name: 'Data Engineering', code: 'IDS-S5-DE', department: 'IDS', semester: 'S5', profEmail: 'sara.elmansouri@uca.ma' },
  // IDS - S6
  { name: 'Projet Data Science', code: 'IDS-S6-PFE', department: 'IDS', semester: 'S6', profEmail: 'fatimaezzahra.ichrak@uca.ma' },
];

// Generate student list
const generateStudents = () => {
  const students = [];
  const groups = [
    { dept: 'GI',  niveau: 'S1', count: 40, prefix: 'gi24' },
    { dept: 'GI',  niveau: 'S2', count: 40, prefix: 'gi23' },
    { dept: 'GI',  niveau: 'S3', count: 35, prefix: 'gi22' },
    { dept: 'GI',  niveau: 'S4', count: 35, prefix: 'gi21' },
    { dept: 'GI',  niveau: 'S5', count: 35, prefix: 'gi20' },
    { dept: 'GI',  niveau: 'S6', count: 35, prefix: 'gi19' },
    { dept: 'IDS', niveau: 'S1', count: 40, prefix: 'ids24' },
    { dept: 'IDS', niveau: 'S2', count: 40, prefix: 'ids23' },
    { dept: 'IDS', niveau: 'S3', count: 35, prefix: 'ids22' },
    { dept: 'IDS', niveau: 'S4', count: 35, prefix: 'ids21' },
    { dept: 'IDS', niveau: 'S5', count: 35, prefix: 'ids20' },
    { dept: 'IDS', niveau: 'S6', count: 35, prefix: 'ids19' },
  ];

  for (const g of groups) {
    for (let i = 1; i <= g.count; i++) {
      const num = String(i).padStart(3, '0');
      students.push({
        name: `Student${g.prefix.toUpperCase()}`,
        prenom: `${num}`,
        email: `student.${g.prefix}${num}@edu.uca.ma`,
        password: 'student123',
        role: 'etudiant',
        numero_etudiant: `${g.prefix.toUpperCase()}${num}`,
        departement: g.dept,
        niveau: g.niveau,
      });
    }
  }
  return students;
};

// ─── SEED ────────────────────────────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connecté à MongoDB');

    // Clear collections
    await Promise.all([User.deleteMany({}), Room.deleteMany({}), Module.deleteMany({})]);
    console.log('🗑️  Collections vidées');

    // Create admins
    for (const a of admins) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(a.password, salt);
      await User.create({ ...a, password: hashed });
    }
    console.log(`✅ ${admins.length} admins créés`);

    // Create professors
    const createdProfs = {};
    for (const p of professors) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(p.password, salt);
      const prof = await User.create({ ...p, password: hashed });
      createdProfs[p.email] = prof._id;
    }
    console.log(`✅ ${professors.length} professeurs créés`);

    // Create students
    const students = generateStudents();
    for (const s of students) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(s.password, salt);
      await User.create({ ...s, password: hashed });
    }
    console.log(`✅ ${students.length} étudiants créés`);

    // Create rooms
    for (const r of roomsData) {
      await Room.create({ ...r, isActive: true });
    }
    console.log(`✅ ${roomsData.length} salles créées`);

    // Create modules
    for (const m of modulesTemplate) {
      const profId = createdProfs[m.profEmail];
      if (!profId) {
        console.warn(`⚠️  Prof introuvable pour ${m.code}: ${m.profEmail}`);
        continue;
      }
      await Module.create({ name: m.name, code: m.code, department: m.department, semester: m.semester, professor: profId, hours: 30, credits: 3 });
    }
    console.log(`✅ ${modulesTemplate.length} modules créés`);

    const totalUsers = admins.length + professors.length + students.length;
    console.log(`\n🎉 SEED TERMINÉ!`);
    console.log(`   👥 Utilisateurs: ${totalUsers}`);
    console.log(`   🏫 Salles: ${roomsData.length}`);
    console.log(`   📚 Modules: ${modulesTemplate.length}`);
    console.log(`\n🔑 COMPTES DE TEST:`);
    console.log(`   Admin: ayoub.imourigue@admin.uca.ma / admin123`);
    console.log(`   Prof:  hassan.fauzi@uca.ma / prof123`);
    console.log(`   Étud:  student.gi24001@edu.uca.ma / student123`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur seed:', error);
    process.exit(1);
  }
}

seed();