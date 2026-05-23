const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/gestion_examens')
  .then(async () => {
    const db = mongoose.connection.db;
    
    const students = await db.collection('users').find({ 
      email: { $regex: "yacoubi", $options: "i" } 
    }).toArray();
    
    console.log("Etudiants avec yacoubi:");
    students.forEach(s => {
      console.log("  " + s.email);
    });
    
    if (students.length === 0) {
      console.log("  Aucun etudiant trouve");
    }
    
    process.exit();
  });
