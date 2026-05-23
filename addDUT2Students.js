const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function addDUT2Students() {
  try {
    await mongoose.connect('mongodb://localhost:27017/gestion_examens');
    console.log('✅ Connecté à MongoDB\n');
    
    const db = mongoose.connection.db;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('student123', salt);
    
    let count = 0;
    
    // 1. Ajouter 80 étudiants GI DUT2
    for (let i = 1; i <= 80; i++) {
      const student = {
        name: `GI2_Etudiant${i}`,
        prenom: `Prenom${i}`,
        email: `student.gi230${String(i).padStart(3, '0')}@edu.uca.ma`,
        password: hashedPassword,
        role: 'etudiant',
        numero_etudiant: `GI230${String(i).padStart(3, '0')}`,
        departement: 'GI',
        niveau: 'DUT2',
        createdAt: new Date()
      };
      await db.collection('users').insertOne(student);
      count++;
    }
    console.log('✅ 80 étudiants GI DUT2 ajoutés');
    
    // 2. Ajouter 80 étudiants IDS DUT2
    for (let i = 1; i <= 80; i++) {
      const student = {
        name: `IDS2_Etudiant${i}`,
        prenom: `Prenom${i}`,
        email: `student.ids230${String(i).padStart(3, '0')}@edu.uca.ma`,
        password: hashedPassword,
        role: 'etudiant',
        numero_etudiant: `IDS230${String(i).padStart(3, '0')}`,
        departement: 'IDS',
        niveau: 'DUT2',
        createdAt: new Date()
      };
      await db.collection('users').insertOne(student);
      count++;
    }
    console.log('✅ 80 étudiants IDS DUT2 ajoutés');
    
    // Résumé final
    const giDUT1 = await db.collection('users').countDocuments({ role: 'etudiant', departement: 'GI', niveau: 'DUT1' });
    const giDUT2 = await db.collection('users').countDocuments({ role: 'etudiant', departement: 'GI', niveau: 'DUT2' });
    const idsDUT1 = await db.collection('users').countDocuments({ role: 'etudiant', departement: 'IDS', niveau: 'DUT1' });
    const idsDUT2 = await db.collection('users').countDocuments({ role: 'etudiant', departement: 'IDS', niveau: 'DUT2' });
    const bdBachelor = await db.collection('users').countDocuments({ role: 'etudiant', departement: 'Big Data', niveau: 'Bachelor' });
    const total = await db.collection('users').countDocuments({ role: 'etudiant' });
    
    console.log('\n📊 RÉSUMÉ FINAL:');
    console.log(`   GI DUT1: ${giDUT1}`);
    console.log(`   GI DUT2: ${giDUT2}`);
    console.log(`   IDS DUT1: ${idsDUT1}`);
    console.log(`   IDS DUT2: ${idsDUT2}`);
    console.log(`   Big Data Bachelor: ${bdBachelor}`);
    console.log(`   Total étudiants: ${total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

addDUT2Students();
