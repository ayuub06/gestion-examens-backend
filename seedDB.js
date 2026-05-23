const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://localhost:27017/gestion_examens';

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // 1. Créer les admins
    const admins = [
      { name: 'Imourigue', prenom: 'Ayoub', email: 'ayoub.imourigue@admin.uca.ma', role: 'admin', createdAt: new Date() },
      { name: 'Elkadiri', prenom: 'Yassine', email: 'yassine.elkadiri@admin.uca.ma', role: 'admin', createdAt: new Date() }
    ];
    
    for (const admin of admins) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash('admin123', salt);
      await db.collection('users').updateOne(
        { email: admin.email },
        { $set: admin },
        { upsert: true }
      );
      console.log(`✅ Admin: ${admin.email}`);
    }
    
    // 2. Créer les professeurs
    const professors = [
      { name: 'Regragui', prenom: 'Youness', email: 'youness.regragui@uca.ma', role: 'professeur', specialization: 'Réseaux & Sécurité' },
      { name: 'Amine', prenom: 'Abdellah', email: 'abdellah.amine@uca.ma', role: 'professeur', specialization: 'Intelligence Artificielle' },
      { name: 'Hammime', prenom: 'Mohammed', email: 'mohammed.hammime@uca.ma', role: 'professeur', specialization: 'Génie Logiciel' },
      { name: 'Ait Daoud', prenom: 'Rachid', email: 'rachid.aitdaoud@uca.ma', role: 'professeur', specialization: 'Mathématiques' },
      { name: 'Fauzi', prenom: 'Hassan', email: 'hassan.fauzi@uca.ma', role: 'professeur', specialization: 'Algorithmique' },
      { name: 'Ichrak', prenom: 'Fatimaezzahra', email: 'fatimaezzahra.ichrak@uca.ma', role: 'professeur', specialization: 'Data Science' }
    ];
    
    for (const prof of professors) {
      const salt = await bcrypt.genSalt(10);
      prof.password = await bcrypt.hash('prof123', salt);
      await db.collection('users').updateOne(
        { email: prof.email },
        { $set: prof },
        { upsert: true }
      );
      console.log(`✅ Professeur: ${prof.email}`);
    }
    
    // 3. Créer les salles
    const rooms = [
      { nom: 'Amphi A', capacite: 150, type: 'amphi', batiment: 'Principal', etage: 0, surveillants_requis: 3 },
      { nom: 'Amphi B', capacite: 150, type: 'amphi', batiment: 'Principal', etage: 0, surveillants_requis: 3 },
      { nom: 'Amphi C', capacite: 150, type: 'amphi', batiment: 'Principal', etage: 0, surveillants_requis: 3 },
      { nom: 'A101', capacite: 80, type: 'grande_salle', batiment: 'A', etage: 1, surveillants_requis: 2 },
      { nom: 'A102', capacite: 80, type: 'grande_salle', batiment: 'A', etage: 1, surveillants_requis: 2 },
      { nom: 'B101', capacite: 80, type: 'grande_salle', batiment: 'B', etage: 1, surveillants_requis: 2 },
      { nom: 'A201', capacite: 40, type: 'petite_salle', batiment: 'A', etage: 2, surveillants_requis: 1 },
      { nom: 'A202', capacite: 40, type: 'petite_salle', batiment: 'A', etage: 2, surveillants_requis: 1 },
      { nom: 'Labo 1', capacite: 30, type: 'labo', batiment: 'C', etage: 1, surveillants_requis: 1 },
      { nom: 'Labo 2', capacite: 30, type: 'labo', batiment: 'C', etage: 1, surveillants_requis: 1 }
    ];
    
    for (const room of rooms) {
      await db.collection('rooms').updateOne(
        { nom: room.nom },
        { $set: room },
        { upsert: true }
      );
      console.log(`✅ Salle: ${room.nom}`);
    }
    
    // 4. Créer les modules
    const users = await db.collection('users').find({ role: 'professeur' }).toArray();
    const profMap = {};
    users.forEach(u => { profMap[u.specialization] = u._id; });
    
    const modules = [
      { code: 'GI101', nom: 'Algorithmique', filiere: 'GI', niveau: 'DUT1', professeur: profMap['Algorithmique'] },
      { code: 'GI102', nom: 'Programmation', filiere: 'GI', niveau: 'DUT1', professeur: profMap['Algorithmique'] },
      { code: 'GI201', nom: 'Base de Données', filiere: 'GI', niveau: 'DUT2', professeur: profMap['Réseaux & Sécurité'] },
      { code: 'GI202', nom: 'Développement Web', filiere: 'GI', niveau: 'DUT2', professeur: profMap['Génie Logiciel'] },
      { code: 'IDS101', nom: 'Statistiques', filiere: 'IDS', niveau: 'DUT1', professeur: profMap['Mathématiques'] },
      { code: 'IDS102', nom: 'Introduction Data', filiere: 'IDS', niveau: 'DUT1', professeur: profMap['Data Science'] },
      { code: 'BD101', nom: 'Python pour Data', filiere: 'Big Data', niveau: 'Bachelor', professeur: profMap['Data Science'] },
      { code: 'BD102', nom: 'Machine Learning', filiere: 'Big Data', niveau: 'Bachelor', professeur: profMap['Intelligence Artificielle'] }
    ];
    
    for (const module of modules) {
      if (module.professeur) {
        await db.collection('modules').updateOne(
          { code: module.code },
          { $set: module },
          { upsert: true }
        );
        console.log(`✅ Module: ${module.code}`);
      }
    }
    
    // 5. Créer des étudiants
    for (let i = 1; i <= 10; i++) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('student123', salt);
      const student = {
        name: `Étudiant${i}`,
        prenom: `Test${i}`,
        email: `student.gi240${String(i).padStart(2, '0')}@edu.uca.ma`,
        password: hashedPassword,
        role: 'etudiant',
        numero_etudiant: `GI240${String(i).padStart(2, '0')}`,
        departement: 'GI',
        niveau: 'DUT1',
        createdAt: new Date()
      };
      await db.collection('users').updateOne(
        { email: student.email },
        { $set: student },
        { upsert: true }
      );
    }
    console.log('✅ 10 étudiants créés');
    
    // Afficher le résumé
    const userCount = await db.collection('users').countDocuments();
    const roomCount = await db.collection('rooms').countDocuments();
    const moduleCount = await db.collection('modules').countDocuments();
    
    console.log('\n📊 RÉSUMÉ FINAL:');
    console.log(`👥 Utilisateurs: ${userCount}`);
    console.log(`🏫 Salles: ${roomCount}`);
    console.log(`📚 Modules: ${moduleCount}`);
    
    console.log('\n🔑 COMPTES DE CONNEXION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Admin: ayoub.imourigue@admin.uca.ma');
    console.log('🔐 Mot de passe: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Professeur: hassan.fauzi@uca.ma');
    console.log('🔐 Mot de passe: prof123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Étudiant: student.gi24001@edu.uca.ma');
    console.log('🔐 Mot de passe: student123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

seedDatabase();
