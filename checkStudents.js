const mongoose = require('mongoose');

async function checkStudents() {
  await mongoose.connect('mongodb://localhost:27017/gestion_examens');
  const db = mongoose.connection.db;
  
  const giCount = await db.collection('users').countDocuments({ role: 'etudiant', departement: 'GI' });
  const idsCount = await db.collection('users').countDocuments({ role: 'etudiant', departement: 'IDS' });
  const bigDataCount = await db.collection('users').countDocuments({ role: 'etudiant', departement: 'Big Data' });
  const total = await db.collection('users').countDocuments({ role: 'etudiant' });
  
  console.log('📊 ÉTUDIANTS DANS LA BASE:');
  console.log(`   GI: ${giCount}`);
  console.log(`   IDS: ${idsCount}`);
  console.log(`   Big Data: ${bigDataCount}`);
  console.log(`   Total: ${total}`);
  
  const dut1 = await db.collection('users').countDocuments({ role: 'etudiant', niveau: 'DUT1' });
  const dut2 = await db.collection('users').countDocuments({ role: 'etudiant', niveau: 'DUT2' });
  const bachelor = await db.collection('users').countDocuments({ role: 'etudiant', niveau: 'Bachelor' });
  
  console.log('\n📊 PAR NIVEAU:');
  console.log(`   DUT1: ${dut1}`);
  console.log(`   DUT2: ${dut2}`);
  console.log(`   Bachelor: ${bachelor}`);
  
  process.exit();
}

checkStudents();
