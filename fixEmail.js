const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/gestion_examens')
  .then(async () => {
    const db = mongoose.connection.db;
    
    // Correction : remplacer l'espace par un point
    const oldEmail = 'karim.el yacoubi34@gi.est.uca.ma';
    const newEmail = 'karim.el_yacoubi34@gi.est.uca.ma';
    
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash('student123', salt);
    
    const result = await db.collection('users').updateOne(
      { email: oldEmail },
      { $set: { email: newEmail, password: newHash } }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Email corrigé:', newEmail);
      console.log('✅ Mot de passe réinitialisé: student123');
    } else {
      console.log('❌ Étudiant non trouvé');
    }
    
    process.exit();
  });
