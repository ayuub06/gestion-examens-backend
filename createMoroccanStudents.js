const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Vrais prénoms marocains
const prenomsHommes = [
  'Mohamed', 'Ahmed', 'Hassan', 'Karim', 'Youssef', 'Mehdi', 'Omar', 'Rachid', 'Said', 'Nabil',
  'Kamal', 'Jamal', 'Adil', 'Fouad', 'Sami', 'Hicham', 'Yassine', 'Amine', 'Hamza', 'Reda',
  'Badr', 'Tarik', 'Zakaria', 'Anas', 'Achraf', 'Sofiane', 'Ilyas', 'Ayoub', 'Othmane', 'Rayan'
];

const prenomsFemmes = [
  'Fatima', 'Khadija', 'Aisha', 'Nadia', 'Sanae', 'Salma', 'Sara', 'Imane', 'Meriem', 'Hind',
  'Noura', 'Leila', 'Rania', 'Samira', 'Karima', 'Meryem', 'Soukaina', 'Hajar', 'Chaimae', 'Oumaima',
  'Wiam', 'Kawtar', 'Rim', 'Dounia', 'Nisrine', 'Asmae', 'Lamyae', 'Ikram', 'Houda', 'Ghita'
];

const nomsMarocains = [
  'Benali', 'Fassi', 'Tazi', 'Amrani', 'Chraibi', 'Berrada', 'Alaoui', 'Rachidi', 'El Mansouri', 'Benjelloun',
  'El Fassi', 'Benhaddou', 'El Khatib', 'El Ouali', 'El Yacoubi', 'Benchekroun', 'Benmoussa', 'El Harrak',
  'Zniber', 'Sebti', 'Lahlou', 'Bencheikh', 'El Mouden', 'Belghiti', 'Filali', 'Kabbaj', 'Benjelloun', 'El Idrissi'
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

const departements = ['GI', 'IDS', 'Big Data'];
const niveaux = ['DUT1', 'DUT2', 'Bachelor'];

async function createStudents() {
  await mongoose.connect('mongodb://localhost:27017/gestion_examens');
  const db = mongoose.connection.db;
  
  console.log('🗑️ Suppression des anciens utilisateurs...');
  await db.collection('users').deleteMany({});
  console.log('✅ Anciens utilisateurs supprimés\n');
  
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('student123', salt);
  
  const students = [];
  
  // 1. GI DUT1 (80 étudiants)
  for (let i = 0; i < 80; i++) {
    const isMale = Math.random() > 0.5;
    const prenom = isMale ? prenomsHommes[Math.floor(Math.random() * prenomsHommes.length)] : prenomsFemmes[Math.floor(Math.random() * prenomsFemmes.length)];
    const nom = nomsMarocains[Math.floor(Math.random() * nomsMarocains.length)];
    const dateNaissance = generateDateNaissance();
    const cin = generateCIN();
    const telephone = generateTelephone();
    const ville = villes[Math.floor(Math.random() * villes.length)];
    
    students.push({
      name: nom,
      prenom: prenom,
      email: `${prenom.toLowerCase()}.${nom.toLowerCase()}${i+1}@gi.est.uca.ma`,
      password: hashedPassword,
      role: 'etudiant',
      numero_etudiant: `GI240${String(i+1).padStart(3, '0')}`,
      departement: 'GI',
      niveau: 'DUT1',
      date_naissance: dateNaissance,
      cin: cin,
      telephone: telephone,
      ville: ville,
      createdAt: new Date()
    });
  }
  console.log('✅ 80 étudiants GI DUT1 créés');
  
  // 2. GI DUT2 (80 étudiants)
  for (let i = 0; i < 80; i++) {
    const isMale = Math.random() > 0.5;
    const prenom = isMale ? prenomsHommes[Math.floor(Math.random() * prenomsHommes.length)] : prenomsFemmes[Math.floor(Math.random() * prenomsFemmes.length)];
    const nom = nomsMarocains[Math.floor(Math.random() * nomsMarocains.length)];
    const dateNaissance = generateDateNaissance();
    const cin = generateCIN();
    const telephone = generateTelephone();
    const ville = villes[Math.floor(Math.random() * villes.length)];
    
    students.push({
      name: nom,
      prenom: prenom,
      email: `${prenom.toLowerCase()}.${nom.toLowerCase()}${i+1}@gi.est.uca.ma`,
      password: hashedPassword,
      role: 'etudiant',
      numero_etudiant: `GI230${String(i+1).padStart(3, '0')}`,
      departement: 'GI',
      niveau: 'DUT2',
      date_naissance: dateNaissance,
      cin: cin,
      telephone: telephone,
      ville: ville,
      createdAt: new Date()
    });
  }
  console.log('✅ 80 étudiants GI DUT2 créés');
  
  // 3. IDS DUT1 (80 étudiants)
  for (let i = 0; i < 80; i++) {
    const isMale = Math.random() > 0.5;
    const prenom = isMale ? prenomsHommes[Math.floor(Math.random() * prenomsHommes.length)] : prenomsFemmes[Math.floor(Math.random() * prenomsFemmes.length)];
    const nom = nomsMarocains[Math.floor(Math.random() * nomsMarocains.length)];
    const dateNaissance = generateDateNaissance();
    const cin = generateCIN();
    const telephone = generateTelephone();
    const ville = villes[Math.floor(Math.random() * villes.length)];
    
    students.push({
      name: nom,
      prenom: prenom,
      email: `${prenom.toLowerCase()}.${nom.toLowerCase()}${i+1}@ids.est.uca.ma`,
      password: hashedPassword,
      role: 'etudiant',
      numero_etudiant: `IDS240${String(i+1).padStart(3, '0')}`,
      departement: 'IDS',
      niveau: 'DUT1',
      date_naissance: dateNaissance,
      cin: cin,
      telephone: telephone,
      ville: ville,
      createdAt: new Date()
    });
  }
  console.log('✅ 80 étudiants IDS DUT1 créés');
  
  // 4. IDS DUT2 (80 étudiants)
  for (let i = 0; i < 80; i++) {
    const isMale = Math.random() > 0.5;
    const prenom = isMale ? prenomsHommes[Math.floor(Math.random() * prenomsHommes.length)] : prenomsFemmes[Math.floor(Math.random() * prenomsFemmes.length)];
    const nom = nomsMarocains[Math.floor(Math.random() * nomsMarocains.length)];
    const dateNaissance = generateDateNaissance();
    const cin = generateCIN();
    const telephone = generateTelephone();
    const ville = villes[Math.floor(Math.random() * villes.length)];
    
    students.push({
      name: nom,
      prenom: prenom,
      email: `${prenom.toLowerCase()}.${nom.toLowerCase()}${i+1}@ids.est.uca.ma`,
      password: hashedPassword,
      role: 'etudiant',
      numero_etudiant: `IDS230${String(i+1).padStart(3, '0')}`,
      departement: 'IDS',
      niveau: 'DUT2',
      date_naissance: dateNaissance,
      cin: cin,
      telephone: telephone,
      ville: ville,
      createdAt: new Date()
    });
  }
  console.log('✅ 80 étudiants IDS DUT2 créés');
  
  // 5. Big Data Bachelor (70 étudiants)
  for (let i = 0; i < 70; i++) {
    const isMale = Math.random() > 0.5;
    const prenom = isMale ? prenomsHommes[Math.floor(Math.random() * prenomsHommes.length)] : prenomsFemmes[Math.floor(Math.random() * prenomsFemmes.length)];
    const nom = nomsMarocains[Math.floor(Math.random() * nomsMarocains.length)];
    const dateNaissance = generateDateNaissance();
    const cin = generateCIN();
    const telephone = generateTelephone();
    const ville = villes[Math.floor(Math.random() * villes.length)];
    
    students.push({
      name: nom,
      prenom: prenom,
      email: `${prenom.toLowerCase()}.${nom.toLowerCase()}${i+1}@bd.est.uca.ma`,
      password: hashedPassword,
      role: 'etudiant',
      numero_etudiant: `BD220${String(i+1).padStart(3, '0')}`,
      departement: 'Big Data',
      niveau: 'Bachelor',
      date_naissance: dateNaissance,
      cin: cin,
      telephone: telephone,
      ville: ville,
      createdAt: new Date()
    });
  }
  console.log('✅ 70 étudiants Big Data Bachelor créés');
  
  // Insertion en base
  await db.collection('users').insertMany(students);
  
  console.log(`\n📊 TOTAL: ${students.length} étudiants créés avec succès!`);
  
  // Afficher quelques exemples
  console.log('\n📋 EXEMPLES:');
  const samples = students.slice(0, 10);
  samples.forEach(s => {
    console.log(`   ${s.prenom} ${s.name} | ${s.email} | ${s.departement} ${s.niveau} | Né le: ${s.date_naissance.toLocaleDateString()} | CIN: ${s.cin} | Tél: ${s.telephone} | ${s.ville}`);
  });
  
  process.exit();
}

createStudents().catch(console.error);
