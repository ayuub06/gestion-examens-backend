const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI manquante dans .env');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log(`✅ MongoDB connecté → ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ Connexion MongoDB échouée :', err.message);
    // retry once after 5 s then exit
    setTimeout(async () => {
      try {
        await mongoose.connect(uri);
        isConnected = true;
        console.log('✅ MongoDB reconnecté (retry)');
      } catch {
        process.exit(1);
      }
    }, 5000);
  }
};

module.exports = connectDB;
