const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const MONGODB_URI = 'mongodb://localhost:27017/gestion_examens';

// LISTE DES ÉTUDIANTS QUE VOUS VOULEZ GARDER
const students = [
    {
        name: "Amrani",
        prenom: "Adam",
        email: "adam.amrani@university.com",
        password: "password123",
        role: "etudiant",
        numero_etudiant: "GI2024020",
        departement: "GI",
        niveau: "S2"
    },
    {
        name: "Benali",
        prenom: "Adam",
        email: "adam.benali@university.com",
        password: "password123",
        role: "etudiant",
        numero_etudiant: "GI2024021",
        departement: "GI",
        niveau: "S3"
    },
    {
        name: "Fassi",
        prenom: "Adam",
        email: "adam.fassi@university.com",
        password: "password123",
        role: "etudiant",
        numero_etudiant: "GI2024022",
        departement: "GI",
        niveau: "S3"
    },
    {
        name: "Tazi",
        prenom: "Hamza",
        email: "hamza.tazi@university.com",
        password: "password123",
        role: "etudiant",
        numero_etudiant: "GI2024023",
        departement: "GI",
        niveau: "S3"
    },
    {
        name: "Tazi",
        prenom: "Youssef",
        email: "youssef.tazi@university.com",
        password: "password123",
        role: "etudiant",
        numero_etudiant: "GI2024005",
        departement: "GI",
        niveau: "S1"
    },
    {
        name: "Chraibi",
        prenom: "Anas",
        email: "anas.chraibi@university.com",
        password: "password123",
        role: "etudiant",
        numero_etudiant: "GI2024006",
        departement: "GI",
        niveau: "S1"
    },
    {
        name: "Imourigue",
        prenom: "Ayoub",
        email: "ayoub.imourigue@university.com",
        password: "password123",
        role: "etudiant",
        numero_etudiant: "GI2024001",
        departement: "GI",
        niveau: "S1"
    }
];

async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

async function seedStudents() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connecté');
        
        console.log('👨‍🎓 Ajout des étudiants...');
        
        for (const student of students) {
            // Vérifier si l'étudiant existe déjà
            const existing = await User.findOne({ email: student.email });
            if (!existing) {
                const hashedPassword = await hashPassword(student.password);
                await User.create({
                    ...student,
                    password: hashedPassword
                });
                console.log(`✅ Ajouté: ${student.prenom} ${student.name} (${student.email})`);
            } else {
                console.log(`⏩ Déjà existant: ${student.email}`);
            }
        }
        
        const count = await User.countDocuments({ role: 'etudiant' });
        console.log(`📊 Total étudiants: ${count}`);
        
        console.log('🎉 Seed des étudiants terminé !');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
}

seedStudents();