// scripts/addProfessors.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const professors = [
    { name: "Hassan", prenom: "Fauzi", email: "fauzi.hassan@university.com", password: "password123", role: "professeur", specialization: "Computer Science & Programming" },
    { name: "Youness", prenom: "Regragui", email: "regragui.younes@university.com", password: "password123", role: "professeur", specialization: "Networks & Security" },
    { name: "Rachid", prenom: "Ait Daoud", email: "rachid.aitdaoud@university.com", password: "password123", role: "professeur", specialization: "Mathematics & Statistics" },
    { name: "Ali", prenom: "Hammime", email: "hammime.ali@university.com", password: "password123", role: "professeur", specialization: "Software Engineering & Web Development" },
    { name: "Mohammed", prenom: "Amin", email: "amin.mohammed@university.com", password: "password123", role: "professeur", specialization: "Databases & Big Data" },
    { name: "Karima", prenom: "El Fassi", email: "karima.elfassi@university.com", password: "password123", role: "professeur", specialization: "Data Science & AI" },
    { name: "Youssef", prenom: "Berrada", email: "youssef.berrada@university.com", password: "password123", role: "professeur", specialization: "Soft Skills & Management" }
];

async function addProfessors() {
    try {
        await mongoose.connect('mongodb://localhost:27017/gestion_examens');
        
        for (const prof of professors) {
            const existing = await User.findOne({ email: prof.email });
            if (!existing) {
                const salt = await bcrypt.genSalt(10);
                prof.password = await bcrypt.hash(prof.password, salt);
                await User.create(prof);
                console.log(`✅ Ajouté: ${prof.prenom} ${prof.name}`);
            } else {
                console.log(`⏩ Existe déjà: ${prof.email}`);
            }
        }
        
        console.log('🎉 Tous les professeurs ont été ajoutés!');
        process.exit();
    } catch (error) {
        console.error('Erreur:', error);
        process.exit(1);
    }
}

addProfessors();