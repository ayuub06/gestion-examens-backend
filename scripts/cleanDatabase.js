const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = 'mongodb://localhost:27017/gestion_examens';

async function cleanDatabase() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connecté');
        
        console.log('🗑️  Nettoyage de la base de données...');
        
        // Garder uniquement l'admin
        const adminEmail = 'admin@university.com';
        
        // Supprimer tous les étudiants
        const deletedStudents = await User.deleteMany({ role: 'etudiant' });
        console.log(`✅ ${deletedStudents.deletedCount} étudiants supprimés`);
        
        // Supprimer tous les professeurs
        const deletedTeachers = await User.deleteMany({ role: 'professeur' });
        console.log(`✅ ${deletedTeachers.deletedCount} professeurs supprimés`);
        
        // Vérifier si l'admin existe
        const admin = await User.findOne({ email: adminEmail });
        if (!admin) {
            const bcrypt = require('bcrypt');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            
            await User.create({
                name: 'Admin',
                prenom: 'System',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin'
            });
            console.log('✅ Admin créé');
        } else {
            console.log('✅ Admin existant conservé');
        }
        
        console.log('🎉 Base de données nettoyée avec succès !');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
}

cleanDatabase();