const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Vrais prénoms marocains
const prenomsHommes = [
  'Mohamed', 'Ahmed', 'Hassan', 'Karim', 'Youssef', 'Mehdi', 'Omar', 'Rachid', 'Said', 'Nabil',
  'Kamal', 'Jamal', 'Adil', 'Fouad', 'Sami', 'Hicham', 'Yassine', 'Amine', 'Hamza', 'Reda'
];

const prenomsFemmes = [
  'Fatima', 'Khadija', 'Aicha', 'Nadia', 'Sanae', 'Salma', 'Sara', 'Imane', 'Meriem', 'Hind',
  'Noura', 'Leila', 'Rania', 'Samira', 'Karima', 'Meryem', 'Soukaina', 'Hajar', 'Chaimae', 'Oumaima'
];

const nomsMarocains = [
  'Benali', 'Fassi', 'Tazi', 'Amrani', 'Chraibi', 'Berrada', 'Alaoui', 'Rachidi', 'El Mansouri', 'Benjelloun',
  'El Fassi', 'Benhaddou', 'El Khatib', 'El Ouali', 'El Yacoubi', 'Benchekroun', 'Benmoussa', 'El Harrak'
];

const villes = ['Casablanca', 'Rabat', 'Fès', 'Marrakech', 'Tanger', 'Agadir', 'Meknès', 'Oujda', 'Tétouan', 'Salé'];

const generateDateNaissance = () => {
  const start = new Date(1995, 0, 1);
  const end = new Date(2005, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const generateCIN = () => {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z'];
  const num = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${letters[Math.floor(Math.random() * letters.length)]}${num}`;
};

const generateTelephone = () => {
  const prefixes = ['06', '07'];
  const num = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${num}`;
};

async function recreateDatabase() {
  try {
    // Connexion à gestion_examens
    await mongoose.connect('mongodb://localhost:27017/gestion_examens');
    const db = mongoose.connection.db;
    
    console.log('🗑️ SUPPRESSION TOTALE DES ANCIENNES DONNÉES...');
    await db.collection('users').deleteMany({});
    await db.collection('rooms').deleteMany({});
    await db.collection('modules').deleteMany({});
    await db.collection('exams').deleteMany({});
    console.log('✅ Toutes les anciennes données supprimées\n');
    
    const salt = await bcrypt.genSalt(10);
    const studentPassword = await bcrypt.hash('student123', salt);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const profPassword = await bcrypt.hash('prof123', salt);
    
    // 1. CRÉER LES ADMINS
    const admins = [
      { name: 'Imourigue', prenom: 'Ayoub', email: 'ayoub.imourigue@admin.uca.ma', password: adminPassword, role: 'admin' },
      { name: 'Elkadiri', prenom: 'Yassine', email: 'yassine.elkadiri@admin.uca.ma', password: adminPassword, role: 'admin' }
    ];
    await db.collection('users').insertMany(admins);
    console.log('✅ 2 admins créés');
    
    // 2. CRÉER LES PROFESSEURS
    const professors = [
      { name: 'Regragui', prenom: 'Youness', email: 'youness.regragui@uca.ma', password: profPassword, role: 'professeur', specialization: 'Réseaux & Sécurité' },
      { name: 'Amine', prenom: 'Abdellah', email: 'abdellah.amine@uca.ma', password: profPassword, role: 'professeur', specialization: 'Intelligence Artificielle' },
      { name: 'Hammime', prenom: 'Mohammed', email: 'mohammed.hammime@uca.ma', password: profPassword, role: 'professeur', specialization: 'Génie Logiciel' },
      { name: 'Ait Daoud', prenom: 'Rachid', email: 'rachid.aitdaoud@uca.ma', password: profPassword, role: 'professeur', specialization: 'Mathématiques' },
      { name: 'Fauzi', prenom: 'Hassan', email: 'hassan.fauzi@uca.ma', password: profPassword, role: 'professeur', specialization: 'Algorithmique' },
      { name: 'Ichrak', prenom: 'Fatimaezzahra', email: 'fatimaezzahra.ichrak@uca.ma', password: profPassword, role: 'professeur', specialization: 'Data Science' }
    ];
    await db.collection('users').insertMany(professors);
    console.log('✅ 6 professeurs créés');
    
    // 3. CRÉER LES SALLES
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
    await db.collection('rooms').insertMany(rooms);
    console.log('✅ 10 salles créées');
    
    // 4. CRÉER LES MODULES
    const modules = [
      { code: 'GI101', nom: 'Algorithmique', filiere: 'GI', niveau: 'DUT1', professeur: professors[4]._id },
      { code: 'GI102', nom: 'Programmation', filiere: 'GI', niveau: 'DUT1', professeur: professors[4]._id },
      { code: 'GI201', nom: 'Base de Données', filiere: 'GI', niveau: 'DUT2', professeur: professors[0]._id },
      { code: 'GI202', nom: 'Développement Web', filiere: 'GI', niveau: 'DUT2', professeur: professors[2]._id },
      { code: 'IDS101', nom: 'Statistiques', filiere: 'IDS', niveau: 'DUT1', professeur: professors[3]._id },
      { code: 'IDS102', nom: 'Introduction Data', filiere: 'IDS', niveau: 'DUT1', professeur: professors[5]._id },
      { code: 'BD101', nom: 'Python pour Data', filiere: 'Big Data', niveau: 'Bachelor', professeur: professors[5]._id },
      { code: 'BD102', nom: 'Machine Learning', filiere: 'Big Data', niveau: 'Bachelor', professeur: professors[1]._id }
    ];
    await db.collection('modules').insertMany(modules);
    console.log('✅ 8 modules créés');
    
    // 5. CRÉER LES ÉTUDIANTS (390 étudiants)
    const allStudents = [];
    
    // GI DUT1 (80)
    for (let i = 0; i < 80; i++) {
      const isMale = Math.random() > 0.5;
      const prenom = isMale ? prenomsHommes[Math.floor(Math.random() * prenomsHommes.length)] : prenomsFemmes[Math.floor(Math.random() * prenomsFemmes.length)];
      const nom = nomsMarocains[Math.floor(Math.random() * nomsMarocains.length)];
      allStudents.push({
        name: nom, prenom: prenom, email: `${prenom.toLowerCase()}.${nom.toLowerCase()}${i+1}@gi.est.uca.ma`,
        password: studentPassword, role: 'etudiant', numero_etudiant: `GI240${String(i+1).padStart(3, '0')}`,
        departement: 'GI', niveau: 'DUT1', date_naissance: generateDateNaissance(),
        cin: generateCIN(), telephone: generateTelephone(), ville: villes[Math.floor(Math.random() * villes.length)],
        createdAt: new Date()
      });
    }
    console.log('✅ 80 étudiants GI DUT1 créés');
    
    // GI DUT2 (80)
    for (let i = 0; i < 80; i++) {
      const isMale = Math.random() > 0.5;
      const prenom = isMale ? prenomsHommes[Math.floor(Math.random() * prenomsHommes.length)] : prenomsFemmes[Math.floor(Math.random() * prenomsFemmes.length)];
      const nom = nomsMarocains[Math.floor(Math.random() * nomsMarocains.length)];
      allStudents.push({
        name: nom, prenom: prenom, email: `${prenom.toLowerCase()}.${nom.toLowerCase()}${i+1}2@gi.est.uca.ma`,
        password: studentPassword, role: 'etudiant', numero_etudiant: `GI230${String(i+1).padStart(3, '0')}`,
        departement: 'GI', niveau: 'DUT2', date_naissance: generateDateNaissance(),
        cin: generateCIN(), telephone: generateTelephone(), ville: villes[Math.floor(Math.random() * villes.length)],
        createdAt: new Date()
      });
    }
    console.log('✅ 80 étudiants GI DUT2 créés');
    
    // IDS DUT1 (80)
    for (let i = 0; i < 80; i++) {
      const isMale = Math.random() > 0.5;
      const prenom = isMale ? prenomsHommes[Math.floor(Math.random() * prenomsHommes.length)] : prenomsFemmes[Math.floor(Math.random() * prenomsFemmes.length)];
      const nom = nomsMarocains[Math.floor(Math.random() * nomsMarocains.length)];
      allStudents.push({
        name: nom, prenom: prenom, email: `${prenom.toLowerCase()}.${nom.toLowerCase()}${i+1}@ids.est.uca.ma`,
        password: studentPassword, role: 'etudiant', numero_etudiant: `IDS240${String(i+1).padStart(3, '0')}`,
        departement: 'IDS', niveau: 'DUT1', date_naissance: generateDateNaissance(),
        cin: generateCIN(), telephone: generateTelephone(), ville: villes[Math.floor(Math.random() * villes.length)],
        createdAt: new Date()
      });
    }
    console.log('✅ 80 étudiants IDS DUT1 créés');
    
    // IDS DUT2 (80)
    for (let i = 0; i < 80; i++) {
      const isMale = Math.random() > 0.5;
      const prenom = isMale ? prenomsHommes[Math.floor(Math.random() * prenomsHommes.length)] : prenomsFemmes[Math.floor(Math.random() * prenomsFemmes.length)];
      const nom = nomsMarocains[Math.floor(Math.random() * nomsMarocains.length)];
      allStudents.push({
        name: nom, prenom: prenom, email: `${prenom.toLowerCase()}.${nom.toLowerCase()}${i+1}2@ids.est.uca.ma`,
        password: studentPassword, role: 'etudiant', numero_etudiant: `IDS230${String(i+1).padStart(3, '0')}`,
        departement: 'IDS', niveau: 'DUT2', date_naissance: generateDateNaissance(),
        cin: generateCIN(), telephone: generateTelephone(), ville: villes[Math.floor(Math.random() * villes.length)],
        createdAt: new Date()
      });
    }
    console.log('✅ 80 étudiants IDS DUT2 créés');
    
    // Big Data Bachelor (70)
    for (let i = 0; i < 70; i++) {
      const isMale = Math.random() > 0.5;
      const prenom = isMale ? prenomsHommes[Math.floor(Math.random() * prenomsHommes.length)] : prenomsFemmes[Math.floor(Math.random() * prenomsFemmes.length)];
      const nom = nomsMarocains[Math.floor(Math.random() * nomsMarocains.length)];
      allStudents.push({
        name: nom, prenom: prenom, email: `${prenom.toLowerCase()}.${nom.toLowerCase()}${i+1}@bd.est.uca.ma`,
        password: studentPassword, role: 'etudiant', numero_etudiant: `BD220${String(i+1).padStart(3, '0')}`,
        departement: 'Big Data', niveau: 'Bachelor', date_naissance: generateDateNaissance(),
        cin: generateCIN(), telephone: generateTelephone(), ville: villes[Math.floor(Math.random() * villes.length)],
        createdAt: new Date()
      });
    }
    console.log('✅ 70 étudiants Big Data Bachelor créés');
    
    await db.collection('users').insertMany(allStudents);
    
    const totalUsers = await db.collection('users').countDocuments();
    const totalStudents = await db.collection('users').countDocuments({ role: 'etudiant' });
    
    console.log(`\n📊 RÉSUMÉ FINAL:`);
    console.log(`   Admins: 2`);
    console.log(`   Professeurs: 6`);
    console.log(`   Étudiants: ${totalStudents}`);
    console.log(`   Total utilisateurs: ${totalUsers}`);
    console.log(`   Salles: 10`);
    console.log(`   Modules: 8`);
    
    console.log('\n🔑 COMPTES DE CONNEXION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Admin: ayoub.imourigue@admin.uca.ma');
    console.log('🔐 Mot de passe: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Professeur: hassan.fauzi@uca.ma');
    console.log('🔐 Mot de passe: prof123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Étudiant: mohamed.benali1@gi.est.uca.ma');
    console.log('🔐 Mot de passe: student123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

recreateDatabase();
