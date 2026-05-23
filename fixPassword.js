const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/gestion_examens')
  .then(async () => {
    const db = mongoose.connection.db;
    
    const student = await db.collection('users').findOne({ email: 'karim.el_yacoubi34@gi.est.uca.ma' });
    
    if (student) {
      console.log('✅ ETUDIANT TROUVE:');
      console.log('   Email:', student.email);
      console.log('   Password hash:', student.password);
      
      const isValid = await bcrypt.compare('student123', student.password);
      console.log('   Mot de passe "student123" valide:', isValid);
      
      if (!isValid) {
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash('student123', salt);
        await db.collection('users').updateOne(
          { email: student.email },
          { $set: { password: newHash } }
        );
        console.log('   ✅ Mot de passe reinitialise a student123');
      }
    } else {
      console.log('❌ Etudiant non trouve');
    }
    
    process.exit();
  });
