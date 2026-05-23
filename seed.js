const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/gestion_examens');

async function seedDatabase() {
  try {
    const db = mongoose.connection.db;
    
    // 1. Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    await db.collection('users').updateOne(
      { email: 'admin@university.com' },
      {
        $set: {
          nom: 'Admin',
          prenom: 'System',
          email: 'admin@university.com',
          password: adminPassword,
          role: 'admin',
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log('✅ Admin créé');

    // 2. Professeurs
    const profs = [
      { nom: 'Hassan', prenom: 'Fauzi', email: 'fauzi.hassan@university.com', specialization: 'Computer Science' },
      { nom: 'Youness', prenom: 'Regragui', email: 'regragui.younes@university.com', specialization: 'Networks' },
      { nom: 'Ali', prenom: 'Hammime', email: 'hammime.ali@university.com', specialization: 'Software Engineering' }
    ];
    
    for (const prof of profs) {
      await db.collection('users').updateOne(
        { email: prof.email },
        {
          $set: {
            nom: prof.nom,
            prenom: prof.prenom,
            email: prof.email,
            password: await bcrypt.hash('password123', 10),
            role: 'professeur',
            specialization: prof.specialization,
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
    }
    console.log('✅ 3 professeurs créés');

    // 3. Étudiants
    const students = [
      { nom: 'Amrani', prenom: 'Karim', email: 'karim.amrani@university.com', numero: 'GI2024020', niveau: 'S4' },
      { nom: 'Benali', prenom: 'Adam', email: 'adam.benali@university.com', numero: 'GI2024021', niveau: 'S3' },
      { nom: 'Imourigue', prenom: 'Ayoub', email: 'ayoub.imourigue@university.com', numero: 'GI2024001', niveau: 'S1' }
    ];
    
    for (const student of students) {
      await db.collection('users').updateOne(
        { email: student.email },
        {
          $set: {
            nom: student.nom,
            prenom: student.prenom,
            email: student.email,
            password: await bcrypt.hash('password123', 10),
            role: 'etudiant',
            numero_etudiant: student.numero,
            departement: 'GI',
            niveau: student.niveau,
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
    }
    console.log('✅ 3 étudiants créés');

    // 4. Salles
    const rooms = [
      { nom: 'Amphi A', capacite: 150, batiment: 'Principal', etage: 0 },
      { nom: 'Salle 101', capacite: 40, batiment: 'A', etage: 1 },
      { nom: 'Salle 102', capacite: 35, batiment: 'A', etage: 1 }
    ];
    
    for (const room of rooms) {
      await db.collection('rooms').updateOne(
        { nom: room.nom },
        { $set: room },
        { upsert: true }
      );
    }
    console.log('✅ 3 salles créées');

    const userCount = await db.collection('users').countDocuments();
    const roomCount = await db.collection('rooms').countDocuments();
    
    console.log('\n📊 RÉSUMÉ FINAL:');
    console.log(`👥 Utilisateurs: ${userCount}`);
    console.log(`🏫 Salles: ${roomCount}`);
    
    process.exit();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

seedDatabase();
