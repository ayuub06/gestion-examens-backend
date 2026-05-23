const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function addStudents() {
  try {
    await mongoose.connect('mongodb://localhost:27017/gestion_examens');
    console.log('✅ Connecté à MongoDB\n');
    
    const db = mongoose.connection.db;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('student123', salt);
    
    let count = 0;
    
    // Ajouter 80 étudiants GI DUT1 (si pas déjà 80)
    const currentGI = await db.collection('users').countDocuments({ role: 'etudiant', departement: 'GI', niveau: 'DUT1' });
    const neededGI = Math.max(0, 80 - currentGI);
    
    for (let i = currentGI + 1; i <= 80; i++) {
      const student = {
        name: `GI_Etudiant${i}`,
        prenom: `Prenom${i}`,
        email: `student.gi240${String(i).padStart(3, '0')}@edu.uca.ma`,
        password: hashedPassword,
        role: 'etudiant',
        numero_etudiant: `GI240${String(i).padStart(3, '0')}`,
        departement: 'GI',
        niveau: 'DUT1',
        createdAt: new Date()
      };
      await db.collection('users').insertOne(student);
      count++;
    }
    console.log(`✅ ${neededGI} étudiants GI DUT1 ajoutés (total: ${currentGI + neededGI})`);
    
    // Ajouter 80 étudiants IDS DUT1
    const currentIDS = await db.collection('users').countDocuments({ role: 'etudiant', departement: 'IDS', niveau: 'DUT1' });
    const neededIDS = Math.max(0, 80 - currentIDS);
    
    for (let i = currentIDS + 1; i <= 80; i++) {
      const student = {
        name: `IDS_Etudiant${i}`,
        prenom: `Prenom${i}`,
        email: `student.ids240${String(i).padStart(3, '0')}@edu.uca.ma`,
        password: hashedPassword,
        role: 'etudiant',
        numero_etudiant: `IDS240${String(i).padStart(3, '0')}`,
        departement: 'IDS',
        niveau: 'DUT1',
        createdAt: new Date()
      };
      await db.collection('users').insertOne(student);
      count++;
    }
    console.log(`✅ ${neededIDS} étudiants IDS DUT1 ajoutés (total: ${currentIDS + neededIDS})`);
    
    // Ajouter 70 étudiants Big Data Bachelor
    const currentBD = await db.collection('users').countDocuments({ role: 'etudiant', departement: 'Big Data', niveau: 'Bachelor' });
    const neededBD = Math.max(0, 70 - currentBD);
    
    for (let i = currentBD + 1; i <= 70; i++) {
      const student = {
        name: `BD_Etudiant${i}`,
        prenom: `Prenom${i}`,
        email: `student.bd220${String(i).padStart(3, '0')}@edu.uca.ma`,
        password: hashedPassword,
        role: 'etudiant',
        numero_etudiant: `BD220${String(i).padStart(3, '0')}`,
        departement: 'Big Data',
        niveau: 'Bachelor',
        createdAt: new Date()
      };
      await db.collection('users').insertOne(student);
      count++;
    }
    console.log(`✅ ${neededBD} étudiants Big Data Bachelor ajoutés (total: ${currentBD + neededBD})`);
    
    const total = await db.collection('users').countDocuments({ role: 'etudiant' });
    console.log(`\n📊 Total étudiants dans la base: ${total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

addStudents();
