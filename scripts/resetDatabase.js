const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function reset() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/university_exam_db');
    console.log('✅ Connecté à MongoDB');

    const collections = await mongoose.connection.db.collections();
    for (const col of collections) {
      await col.deleteMany({});
      console.log(`🗑️  Collection "${col.collectionName}" vidée`);
    }

    console.log('\n✅ Base de données réinitialisée. Exécutez: node scripts/seedDatabase.js');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

reset();