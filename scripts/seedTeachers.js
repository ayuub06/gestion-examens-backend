const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const MONGODB_URI = 'mongodb://localhost:27017/gestion_examens';

// LISTE DES PROFESSEURS QUE VOUS VOULEZ GARDER
const teachers = [
    {
        name: "Hassan",
        prenom: "Fauzi",
        email: "fauzi.hassan@university.com",
        password: "password123",
        role: "professeur",
        specialization: "Computer Science & Programming"
    },
    {
        name: "Youness",
        prenom: "Regragui",
        email: "regragui.younes@university.com",
        password: "password123",
        role: "professeur",
        specialization: "Networks & Security"
    },
    {
        name: "Rachid",
        prenom: "Ait Daoud",
        email: "rachid.aitdaoud@university.com",
        password: "password123",
        role: "professeur",
        specialization: "Mathematics & Statistics"
    },
    {
        name: "Ali",
        prenom: "Hammime",
        email: "hammime.ali@university.com",
        password: "password123",
        role: "professeur",
        specialization: "Software Engineering & Web Development"
    },
    {
        name: "Mohammed",
        prenom: "Amin",
        email: "amin.mohammed@university.com",
        password: "password123",
        role: "professeur",
        specialization: "Databases & Big Data"
    }
];

async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

async function seedTeachers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connecté');
        
        console.log('👨‍🏫 Ajout des professeurs...');
        
        for (const teacher of teachers) {
            // Vérifier si le professeur existe déjà
            const existing = await User.findOne({ email: teacher.email });
            if (!existing) {
                const hashedPassword = await hashPassword(teacher.password);
                await User.create({
                    ...teacher,
                    password: hashedPassword
                });
                console.log(`✅ Ajouté: ${teacher.prenom} ${teacher.name} (${teacher.email})`);
            } else {
                console.log(`⏩ Déjà existant: ${teacher.email}`);
            }
        }
        
        const count = await User.countDocuments({ role: 'professeur' });
        console.log(`📊 Total professeurs: ${count}`);
        
        console.log('🎉 Seed des professeurs terminé !');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
}

seedTeachers();