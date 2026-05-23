// schedulingLogic.js
const professors = [
    { name: "Dr. Fauzi Hassan", specialization: "Computer Science & Programming" },
    { name: "Dr. Regragui Youness", specialization: "Networks & Security" },
    { name: "Dr. Rachid Ait Daoud", specialization: "Mathematics & Statistics" },
    { name: "Dr. Hammime Ali", specialization: "Software Engineering & Web Development" },
    { name: "Dr. Amin Mohammed", specialization: "Databases & Big Data" },
    { name: "Dr. Karima El Fassi", specialization: "Data Science & AI" },
    { name: "Dr. Youssef Berrada", specialization: "Soft Skills & Management" }
];

// Périodes d'examens
const EXAM_PERIODS = {
    PRINCIPAL: {
        start: '2025-01-01',
        end: '2025-01-07',
        days: 7
    },
    RATTRAPAGE: {
        start: '2025-01-08',
        end: '2025-01-15',
        days: 8
    }
};

// Crénaux horaires
const TIME_SLOTS = [
    { start: '08:00', end: '10:00' },
    { start: '10:30', end: '12:30' },
    { start: '14:00', end: '16:00' },
    { start: '16:30', end: '18:30' }
];

// Salles par département
const ROOMS = {
    GI: ['GI101', 'GI102', 'GI103', 'GI201', 'GI202'],
    IDS: ['IDS101', 'IDS102', 'IDS103'],
    COMMON: ['Amphi A', 'Amphi B', 'B101', 'B202']
};

// Modules par département et niveau
const MODULES = {
    GI: {
        S1: [
            { name: "Algorithmique et Programmation", code: "GI101", professor: "Dr. Rachid Ait Daoud" },
            { name: "Mathématiques 1 (Algèbre)", code: "GI102", professor: "Dr. Rachid Ait Daoud" },
            { name: "Architecture des Ordinateurs", code: "GI103", professor: "Dr. Regragui Youness" },
            { name: "Systèmes d'Exploitation 1", code: "GI104", professor: "Dr. Regragui Youness" },
            { name: "Réseaux 1", code: "GI105", professor: "Dr. Regragui Youness" },
            { name: "Introduction à la Programmation Web", code: "GI106", professor: "Dr. Hammime Ali" }
        ],
        S2: [
            { name: "Base de Données 1", code: "GI201", professor: "Dr. Amin Mohammed" },
            { name: "Mathématiques 2 (Analyse)", code: "GI202", professor: "Dr. Rachid Ait Daoud" },
            { name: "Programmation Orientée Objet", code: "GI203", professor: "Dr. Hammime Ali" },
            { name: "Développement Web 1", code: "GI204", professor: "Dr. Hammime Ali" },
            { name: "Systèmes d'Exploitation 2", code: "GI205", professor: "Dr. Regragui Youness" }
        ],
        S3: [
            { name: "Base de Données 2", code: "GI301", professor: "Dr. Amin Mohammed" },
            { name: "Développement Web 2", code: "GI302", professor: "Dr. Hammime Ali" },
            { name: "Algorithmique Avancée", code: "GI303", professor: "Dr. Rachid Ait Daoud" },
            { name: "Génie Logiciel", code: "GI304", professor: "Dr. Hammime Ali" }
        ]
    },
    IDS: {
        S1: [
            { name: "Introduction à la Décision", code: "IDS101", professor: "Dr. Karima El Fassi" },
            { name: "Statistiques Descriptives", code: "IDS102", professor: "Dr. Karima El Fassi" },
            { name: "Programmation pour IDS", code: "IDS103", professor: "Dr. Hammime Ali" },
            { name: "Base de Données", code: "IDS104", professor: "Dr. Amin Mohammed" }
        ],
        S2: [
            { name: "Data Mining", code: "IDS201", professor: "Dr. Karima El Fassi" },
            { name: "Probabilités", code: "IDS202", professor: "Dr. Rachid Ait Daoud" },
            { name: "SQL Avancé", code: "IDS203", professor: "Dr. Amin Mohammed" }
        ]
    },
    COMMON: {
        all: [
            { name: "Anglais Technique", code: "COM101", professor: "Dr. Youssef Berrada" },
            { name: "Communication et Expression", code: "COM102", professor: "Dr. Youssef Berrada" },
            { name: "Droit et Éthique", code: "COM103", professor: "Dr. Youssef Berrada" }
        ]
    }
};

// Fonction pour générer les dates sur une période
function generateDates(startDate, endDate, excludeWeekends = false) {
    const dates = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
        const dayOfWeek = current.getDay();
        if (!excludeWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
            dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

// Fonction pour obtenir un professeur aléatoire différent
function getRandomProfessor(excludeProfessor = null) {
    let available = [...professors];
    if (excludeProfessor) {
        available = available.filter(p => p.name !== excludeProfessor);
    }
    return available[Math.floor(Math.random() * available.length)];
}

// Fonction principale pour générer le planning
function generateSchedule(modules, dates, timeSlots, rooms, type = 'PRINCIPAL') {
    const schedule = [];
    let moduleIndex = 0;
    let roomIndex = 0;
    let professorRotation = 0;
    
    for (const date of dates) {
        for (const timeSlot of timeSlots) {
            if (moduleIndex >= modules.length) break;
            
            const module = modules[moduleIndex];
            
            // Choisir une salle (alternance)
            const roomList = rooms[module.department === 'COMMON' ? 'COMMON' : module.department];
            const room = roomList[roomIndex % roomList.length];
            
            // Choisir un professeur (rotation pour éviter le même professeur)
            const professor = professors[professorRotation % professors.length];
            
            schedule.push({
                module: module.name,
                code: module.code,
                date: date.toISOString().split('T')[0],
                startTime: timeSlot.start,
                endTime: timeSlot.end,
                room: room,
                supervisor: professor.name,
                type: type
            });
            
            moduleIndex++;
            roomIndex++;
            professorRotation++;
        }
    }
    
    return schedule;
}

// Fonction pour organiser les examens par étudiant
function assignExamsToStudents(exams, students) {
    const studentExams = {};
    
    students.forEach(student => {
        studentExams[student._id] = exams.filter(exam => {
            // Associer les examens selon le département et le niveau
            const examDept = exam.code.includes('GI') ? 'GI' : 
                           exam.code.includes('IDS') ? 'IDS' : 'COMMON';
            const examLevel = exam.code.match(/GI\d{3}/) ? 
                             exam.code.substring(2, 4) : null;
            
            return examDept === student.departement && 
                   (examLevel === student.niveau || exam.type === 'COMMON');
        });
    });
    
    return studentExams;
}

module.exports = {
    EXAM_PERIODS,
    TIME_SLOTS,
    ROOMS,
    MODULES,
    professors,
    generateDates,
    getRandomProfessor,
    generateSchedule,
    assignExamsToStudents
};