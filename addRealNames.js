const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Liste des vrais prénoms et noms
const prenoms = [
  'Adam', 'Youssef', 'Mehdi', 'Karim', 'Anas', 'Hamza', 'Yassine', 'Omar', 'Reda', 'Ayoub',
  'Sofia', 'Sarah', 'Fatima', 'Leila', 'Nadia', 'Hajar', 'Salma', 'Imane', 'Meriem', 'Nour'
];

const noms = [
  'Benali', 'Fassi', 'Tazi', 'Amrani', 'Chraibi', 'Berrada', 'Alaoui', 'Rachidi', 'El Mansouri', 'Benjelloun',
  'El Fassi', 'Benhaddou', 'El Khatib', 'El Ouali', 'El Yacoubi', 'Benchekroun', 'Benmoussa', 'El Harrak'
];

// Générer un nom aléatoire
function getRandomName() {
  const prenom = prenoms[Math.floor(Math.random() * prenoms.length)];
  const nom = noms[Math.floor(Math.random() * noms.length)];
  return { prenom, nom };
}

async function addRealNames() {
  try {
    await mongoose.connect('mongodb://localhost:27017/gestion_examens');
    console.log('✅ Connecté à MongoDB\n');
    
    const db = mongoose.connection.db;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('student123', salt);
    
    let count = 0;
    
    // 1. Mettre à jour les étudiants GI DUT1
    const giDUT1 = await db.collection('users').find({ role: 'etudiant', departement: 'GI', niveau: 'DUT1' }).toArray();
    for (let i = 0; i < giDUT1.length; i++) {
      const { prenom, nom } = getRandomName();
      const num = String(i + 1).padStart(3, '0');
      await db.collection('users').updateOne(
        { _id: giDUT1[i]._id },
        { 
          $set: {
            name: nom,
            prenom: prenom,
            email: `gi.${prenom.toLowerCase()}.${nom.toLowerCase()}@edu.uca.ma`,
            password: hashedPassword,
            numero_etudiant: `GI240${num}`
          }
        }
      );
      count++;
      if (i < 20) console.log(`✅ ${prenom} ${nom} - GI DUT1`);
    }
    console.log(`\n✅ ${giDUT1.length} étudiants GI DUT1 mis à jour\n`);
    
    // 2. Mettre à jour les étudiants GI DUT2
    const giDUT2 = await db.collection('users').find({ role: 'etudiant', departement: 'GI', niveau: 'DUT2' }).toArray();
    for (let i = 0; i < giDUT2.length; i++) {
      const { prenom, nom } = getRandomName();
      const num = String(i + 1).padStart(3, '0');
      await db.collection('users').updateOne(
        { _id: giDUT2[i]._id },
        { 
          $set: {
            name: nom,
            prenom: prenom,
            email: `gi.${prenom.toLowerCase()}.${nom.toLowerCase()}2@edu.uca.ma`,
            numero_etudiant: `GI230${num}`
          }
        }
      );
    }
    console.log(`✅ ${giDUT2.length} étudiants GI DUT2 mis à jour\n`);
    
    // 3. Mettre à jour les étudiants IDS DUT1
    const idsDUT1 = await db.collection('users').find({ role: 'etudiant', departement: 'IDS', niveau: 'DUT1' }).toArray();
    for (let i = 0; i < idsDUT1.length; i++) {
      const { prenom, nom } = getRandomName();
      const num = String(i + 1).padStart(3, '0');
      await db.collection('users').updateOne(
        { _id: idsDUT1[i]._id },
        { 
          $set: {
            name: nom,
            prenom: prenom,
            email: `ids.${prenom.toLowerCase()}.${nom.toLowerCase()}@edu.uca.ma`,
            numero_etudiant: `IDS240${num}`
          }
        }
      );
    }
    console.log(`✅ ${idsDUT1.length} étudiants IDS DUT1 mis à jour\n`);
    
    // 4. Mettre à jour les étudiants IDS DUT2
    const idsDUT2 = await db.collection('users').find({ role: 'etudiant', departement: 'IDS', niveau: 'DUT2' }).toArray();
    for (let i = 0; i < idsDUT2.length; i++) {
      const { prenom, nom } = getRandomName();
      const num = String(i + 1).padStart(3, '0');
      await db.collection('users').updateOne(
        { _id: idsDUT2[i]._id },
        { 
          $set: {
            name: nom,
            prenom: prenom,
            email: `ids.${prenom.toLowerCase()}.${nom.toLowerCase()}2@edu.uca.ma`,
            numero_etudiant: `IDS230${num}`
          }
        }
      );
    }
    console.log(`✅ ${idsDUT2.length} étudiants IDS DUT2 mis à jour\n`);
    
    // 5. Mettre à jour les étudiants Big Data
    const bd = await db.collection('users').find({ role: 'etudiant', departement: 'Big Data', niveau: 'Bachelor' }).toArray();
    for (let i = 0; i < bd.length; i++) {
      const { prenom, nom } = getRandomName();
      const num = String(i + 1).padStart(3, '0');
      await db.collection('users').updateOne(
        { _id: bd[i]._id },
        { 
          $set: {
            name: nom,
            prenom: prenom,
            email: `bd.${prenom.toLowerCase()}.${nom.toLowerCase()}@edu.uca.ma`,
            numero_etudiant: `BD220${num}`
          }
        }
      );
    }
    console.log(`✅ ${bd.length} étudiants Big Data mis à jour\n`);
    
    // Afficher quelques exemples
    console.log('\n📋 EXEMPLES D\'ÉTUDIANTS:');
    const samples = await db.collection('users').find({ role: 'etudiant' }).limit(10).toArray();
    samples.forEach(s => {
      console.log(`   ${s.prenom} ${s.name} - ${s.email} - ${s.departement} ${s.niveau}`);
    });
    
    const total = await db.collection('users').countDocuments({ role: 'etudiant' });
    console.log(`\n📊 Total étudiants mis à jour: ${total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

addRealNames();
