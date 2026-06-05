/**
 * scripts/seedDatabase.js
 *
 * Full reseed — Session Normale only (S1/S3/S5, 01–07 Jun).
 * Target: 7 exams per student group per session.
 *   S1: 2 COMMON + 5 dept = 7
 *   S3: 1 COMMON + 6 dept = 7
 *   S5: 7 dept = 7
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User   = require('../models/User');
const Room   = require('../models/Room');
const Module = require('../models/Module');
const Exam   = require('../models/Exam');

// ─────────────────────────────────────────────────────────────────────────────
// MOROCCAN NAMES
// ─────────────────────────────────────────────────────────────────────────────

const MALE_PRENOMS = [
  'Mohammed','Ahmed','Youssef','Hamza','Omar','Khalid','Rachid','Mehdi',
  'Amine','Karim','Hassan','Tariq','Iliyas','Saad','Zakaria','Walid',
  'Nabil','Redouane','Hicham','Ismail','Aymane','Othmane','Aziz','Mouad',
  'Adam','Soufiane','Nawfal','Younes','Bilal','Ayoub','Mounir','Abdellah',
  'Yahya','Badr','Nassim','Driss','Anass','Fouad','Marouane','Tarik',
];
const FEMALE_PRENOMS = [
  'Fatima','Zineb','Khadija','Nadia','Sara','Hajar','Aicha','Maryam',
  'Houda','Laila','Soukaina','Imane','Rajaa','Safae','Kaoutar','Maroua',
  'Hind','Sanae','Samira','Oumaima','Salma','Amira','Hanane','Narjiss',
  'Boutaina','Meriem','Nezha','Latifa','Wafae','Nawal','Rim','Chaimae',
  'Loubna','Yasmine','Ghita','Rania','Malak','Asma','Nihal','Sana',
];
const NOMS = [
  'Benali','Idrissi','Tazi','Bennani','Chakir','Mansouri','Filali','Chraibi',
  'Benkiran','Alaoui','Bensouda','Ziani','Lahlou','Senhaji','Berrada','Benkirane',
  'Tahiri','Elamrani','Belhaj','Meskini','Benabou','Douiri','Guessous','Hajji',
  'Kettani','Bennis','Ouzzif','Elharti','Lyazidi','Benomar','Cherkaoui','Sebti',
  'Benzakour','Hasnaoui','Mouline','Roudani','Sahraoui','Kbiri','Belghiti','Moussaoui',
  'Jebli','Benzehra','Ouazzani','Bajja','Khaloufi','Elhaddad','Laabioui','Regragui',
  'Fakhri','Bousselham','Zeroual','Benchekroun','Charai','Elidrissi','Elghazi','Bencharif',
  'Berrehili','Taoussi','Elabbassi','Belharizi','Benslimane','Errami','Ouchhab','Belabbes',
  'Benbirk','Chami','Elhajj','Ghali','Benmoussa','Elansari','Zerouki','Benazzouz',
  'Aithammou','Kadiri','Naciri','Bihi','Belkadi','Benyahia','Sqalli','Lamrani',
];

const normalizeEmail = str =>
  str.toLowerCase()
     .normalize('NFD').replace(/[̀-ͯ]/g, '')
     .replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION DATA
// ─────────────────────────────────────────────────────────────────────────────

const ADMINS = [
  { name:'Imourigue', prenom:'Ayoub',   email:'ayoub.imourigue@admin.uca.ma',  password:'admin123', role:'admin' },
  { name:'El Kadiri', prenom:'Yassine', email:'yassine.elkadiri@admin.uca.ma', password:'admin123', role:'admin' },
];

const PROFESSORS = [
  { name:'Regragui',   prenom:'Youness',       email:'youness.regragui@uca.ma',     specialization:'Réseaux & Sécurité' },
  { name:'Amine',      prenom:'Abdellah',       email:'abdellah.amine@uca.ma',       specialization:'Intelligence Artificielle' },
  { name:'Hammime',    prenom:'Mohammed',       email:'mohammed.hammime@uca.ma',     specialization:'Génie Logiciel' },
  { name:'Ait Daoud',  prenom:'Rachid',         email:'rachid.aitdaoud@uca.ma',      specialization:'Mathématiques' },
  { name:'Fauzi',      prenom:'Hassan',         email:'hassan.fauzi@uca.ma',         specialization:'Algorithmique' },
  { name:'Ichrak',     prenom:'Fatimaezzahra',  email:'fatimaezzahra.ichrak@uca.ma', specialization:'Data Science' },
  { name:'Benjelloun', prenom:'Karim',          email:'karim.benjelloun@uca.ma',     specialization:'Base de Données' },
  { name:'El Mansouri',prenom:'Sara',           email:'sara.elmansouri@uca.ma',      specialization:'Cloud Computing' },
  { name:'Tazi',       prenom:'Mehdi',          email:'mehdi.tazi@uca.ma',           specialization:'Développement Mobile' },
  { name:'Alaoui',     prenom:'Leila',          email:'leila.alaoui@uca.ma',         specialization:'Soft Skills' },
  { name:'Benhaddou',  prenom:'Khalid',         email:'khalid.benhaddou@uca.ma',     specialization:'Génie Civil' },
  { name:'Mouhim',     prenom:'Samira',         email:'samira.mouhim@uca.ma',        specialization:'Génie Électrique' },
  { name:'El Ouardi',  prenom:'Youssef',        email:'youssef.elouardi@uca.ma',     specialization:'Génie Mécanique' },
  { name:'Chafik',     prenom:'Nadia',          email:'nadia.chafik@uca.ma',         specialization:'Management' },
  { name:'Raji',       prenom:'Omar',           email:'omar.raji@uca.ma',            specialization:'Informatique de Gestion' },
];

// 23 rooms
const ROOMS = [
  { nom:'Amphi A',  capacite:150, batiment:'Principal', etage:0, type:'amphi' },
  { nom:'Amphi B',  capacite:150, batiment:'Principal', etage:0, type:'amphi' },
  { nom:'Amphi C',  capacite:150, batiment:'Principal', etage:0, type:'amphi' },
  { nom:'A101',     capacite:80,  batiment:'A', etage:1, type:'grande_salle' },
  { nom:'A102',     capacite:80,  batiment:'A', etage:1, type:'grande_salle' },
  { nom:'B101',     capacite:80,  batiment:'B', etage:1, type:'grande_salle' },
  { nom:'B102',     capacite:80,  batiment:'B', etage:1, type:'grande_salle' },
  { nom:'C101',     capacite:80,  batiment:'C', etage:1, type:'grande_salle' },
  { nom:'C102',     capacite:80,  batiment:'C', etage:1, type:'grande_salle' },
  { nom:'A201',     capacite:40,  batiment:'A', etage:2, type:'petite_salle' },
  { nom:'A202',     capacite:40,  batiment:'A', etage:2, type:'petite_salle' },
  { nom:'B201',     capacite:40,  batiment:'B', etage:2, type:'petite_salle' },
  { nom:'B202',     capacite:40,  batiment:'B', etage:2, type:'petite_salle' },
  { nom:'C201',     capacite:40,  batiment:'C', etage:2, type:'petite_salle' },
  { nom:'C202',     capacite:40,  batiment:'C', etage:2, type:'petite_salle' },
  { nom:'D101',     capacite:40,  batiment:'D', etage:1, type:'petite_salle' },
  { nom:'D102',     capacite:40,  batiment:'D', etage:1, type:'petite_salle' },
  { nom:'E101',     capacite:40,  batiment:'E', etage:1, type:'petite_salle' },
  { nom:'E102',     capacite:40,  batiment:'E', etage:1, type:'petite_salle' },
  { nom:'Labo 1',   capacite:30,  batiment:'C', etage:1, type:'labo' },
  { nom:'Labo 2',   capacite:30,  batiment:'C', etage:1, type:'labo' },
  { nom:'Labo 3',   capacite:30,  batiment:'D', etage:1, type:'labo' },
  { nom:'Labo 4',   capacite:30,  batiment:'D', etage:1, type:'labo' },
];

// Target: ~2010 students
const STUDENT_COHORTS = [
  ['GI',      'DUT1',     150, 'gi24',   '2024'],
  ['GI',      'DUT2',     150, 'gi23',   '2023'],
  ['GI',      'Bachelor', 120, 'gi22',   '2022'],
  ['IDS',     'DUT1',     120, 'ids24',  '2024'],
  ['IDS',     'DUT2',     120, 'ids23',  '2023'],
  ['IDS',     'Bachelor', 100, 'ids22',  '2022'],
  ['BigData', 'Bachelor', 100, 'bd22',   '2022'],
  ['GC',  'DUT1',      80, 'gc24',  '2024'],
  ['GC',  'DUT2',      80, 'gc23',  '2023'],
  ['GC',  'Bachelor',  70, 'gc22',  '2022'],
  ['GE',  'DUT1',      80, 'ge24',  '2024'],
  ['GE',  'DUT2',      80, 'ge23',  '2023'],
  ['GE',  'Bachelor',  70, 'ge22',  '2022'],
  ['GM',  'DUT1',      80, 'gm24',  '2024'],
  ['GM',  'DUT2',      80, 'gm23',  '2023'],
  ['GM',  'Bachelor',  70, 'gm22',  '2022'],
  ['TM',  'DUT1',      80, 'tm24',  '2024'],
  ['TM',  'DUT2',      80, 'tm23',  '2023'],
  ['TM',  'Bachelor',  70, 'tm22',  '2022'],
  ['IG',  'DUT1',      80, 'ig24',  '2024'],
  ['IG',  'DUT2',      80, 'ig23',  '2023'],
  ['IG',  'Bachelor',  70, 'ig22',  '2022'],
];

// ─────────────────────────────────────────────────────────────────────────────
// MODULE TEMPLATES — Session Normale ONLY (S1/S3/S5)
// S1: 5 dept modules per dept + 2 COMMON = 7 exams for DUT1 students
// S3: 6 dept modules per dept + 1 COMMON = 7 exams for DUT2 students
// S5: 7 dept modules per dept = 7 exams for Bachelor students
// ─────────────────────────────────────────────────────────────────────────────
const MODULE_TEMPLATES = [
  // ── GI – S1 (5 dept modules) ──────────────────────────────────────────────
  ['Algorithmique et Structures de Données',     'GI101', 'GI','S1','DUT1',    4, 'theorique'],
  ['Programmation Orientée Objet (Java)',         'GI102', 'GI','S1','DUT1',    2, 'pratique'],
  ['Architecture des Ordinateurs',               'GI103', 'GI','S1','DUT1',    3, 'theorique'],
  ['Logique Mathématique',                       'GI104', 'GI','S1','DUT1',    3, 'theorique'],
  ['Initiation à la Cybersécurité',             'GI105', 'GI','S1','DUT1',    0, 'theorique'],
  // GI – S3 (6 dept modules)
  ['Systèmes d\'Exploitation',                  'GI301', 'GI','S3','DUT2',    4, 'theorique'],
  ['Réseaux Informatiques II',                  'GI302', 'GI','S3','DUT2',    0, 'theorique'],
  ['Développement Web Back-End',                'GI303', 'GI','S3','DUT2',    2, 'pratique'],
  ['Compilation & Langages Formels',            'GI304', 'GI','S3','DUT2',    4, 'theorique'],
  ['Infrastructure Cloud',                       'GI305', 'GI','S3','DUT2',    7, 'theorique'],
  ['Data Science Introduction',                  'GI306', 'GI','S3','DUT2',    5, 'theorique'],
  // GI – S5 (7 dept modules)
  ['Cloud Computing & DevOps',                  'GI501', 'GI','S5','Bachelor', 7, 'theorique'],
  ['Développement Mobile',                      'GI502', 'GI','S5','Bachelor', 8, 'pratique'],
  ['Entrepreneuriat Technologique',             'GI503', 'GI','S5','Bachelor', 9, 'theorique'],
  ['Architecture Microservices Avancée',        'GI504', 'GI','S5','Bachelor', 7, 'theorique'],
  ['Cybersécurité & Pentesting',               'GI505', 'GI','S5','Bachelor', 0, 'theorique'],
  ['Machine Learning Appliqué',                'GI506', 'GI','S5','Bachelor', 1, 'theorique'],
  ['Projet Innovation Numérique',              'GI507', 'GI','S5','Bachelor', 2, 'pratique'],

  // ── IDS – S1 (5 dept modules) ─────────────────────────────────────────────
  ['Statistiques et Probabilités',              'IDS101','IDS','S1','DUT1',   3, 'theorique'],
  ['Programmation Python',                      'IDS102','IDS','S1','DUT1',   5, 'pratique'],
  ['Introduction au Big Data',                  'IDS103','IDS','S1','DUT1',   5, 'theorique'],
  ['Algèbre Linéaire',                         'IDS104','IDS','S1','DUT1',   3, 'theorique'],
  ['Bases de la Programmation R',              'IDS105','IDS','S1','DUT1',   5, 'pratique'],
  // IDS – S3 (6 dept modules)
  ['Data Warehouse',                            'IDS301','IDS','S3','DUT2',   6, 'theorique'],
  ['Big Data Technologies (Hadoop/Spark)',       'IDS302','IDS','S3','DUT2',   5, 'pratique'],
  ['Machine Learning II',                       'IDS303','IDS','S3','DUT2',   1, 'theorique'],
  ['Fouille de Données',                       'IDS304','IDS','S3','DUT2',   5, 'theorique'],
  ['Systèmes de Recommandation',               'IDS305','IDS','S3','DUT2',   1, 'theorique'],
  ['Infrastructure Big Data',                   'IDS306','IDS','S3','DUT2',   7, 'theorique'],
  // IDS – S5 (7 dept modules)
  ['NLP & Text Mining',                         'IDS501','IDS','S5','Bachelor',5, 'theorique'],
  ['Computer Vision',                           'IDS502','IDS','S5','Bachelor',1, 'theorique'],
  ['MLOps & Déploiement IA',                   'IDS503','IDS','S5','Bachelor',7, 'pratique'],
  ['IA Générative & LLM',                      'IDS504','IDS','S5','Bachelor',1, 'theorique'],
  ['DataOps & Ingénierie Données',             'IDS505','IDS','S5','Bachelor',7, 'theorique'],
  ['Éthique de l\'IA',                         'IDS506','IDS','S5','Bachelor',9, 'theorique'],
  ['Projet Data Science',                       'IDS507','IDS','S5','Bachelor',5, 'pratique'],

  // ── BigData – S5 (7 dept modules) ────────────────────────────────────────
  ['Architecture Big Data',                     'BD501','BigData','S5','Bachelor',5, 'theorique'],
  ['Streaming & Temps Réel',                   'BD502','BigData','S5','Bachelor',7, 'theorique'],
  ['Ingénierie des Pipelines Données',         'BD503','BigData','S5','Bachelor',5, 'theorique'],
  ['Machine Learning à Grande Échelle',        'BD504','BigData','S5','Bachelor',1, 'theorique'],
  ['Gouvernance des Données',                  'BD505','BigData','S5','Bachelor',9, 'theorique'],
  ['Cloud Analytics',                           'BD506','BigData','S5','Bachelor',7, 'theorique'],
  ['Projet Big Data Avancé',                   'BD507','BigData','S5','Bachelor',5, 'pratique'],

  // ── GC – S1 (5 dept modules) ──────────────────────────────────────────────
  ['Mécanique des Structures',                  'GC101','GC','S1','DUT1',10, 'theorique'],
  ['Topographie',                               'GC102','GC','S1','DUT1',10, 'theorique'],
  ['Géologie Appliquée',                       'GC103','GC','S1','DUT1',10, 'theorique'],
  ['Dessin Technique',                          'GC104','GC','S1','DUT1',10, 'theorique'],
  ['Matériaux de Construction',                'GC105','GC','S1','DUT1',10, 'theorique'],
  // GC – S3 (6 dept modules)
  ['Résistance des Matériaux',                 'GC301','GC','S3','DUT2',10, 'theorique'],
  ['Routes & Voiries',                          'GC302','GC','S3','DUT2',10, 'theorique'],
  ['Conception des Ouvrages d\'Art',           'GC303','GC','S3','DUT2',10, 'theorique'],
  ['BTP & Environnement',                      'GC304','GC','S3','DUT2',10, 'theorique'],
  ['Calcul des Structures',                    'GC305','GC','S3','DUT2',10, 'theorique'],
  ['Assainissement & Épuration',               'GC306','GC','S3','DUT2',10, 'theorique'],
  // GC – S5 (7 dept modules)
  ['Projet de Fin d\'Études GC',             'GC501','GC','S5','Bachelor',10, 'theorique'],
  ['Ingénierie Parasismique',                 'GC502','GC','S5','Bachelor',10, 'theorique'],
  ['BIM & Modélisation 3D',                  'GC503','GC','S5','Bachelor',10, 'pratique'],
  ['Géotechnique Avancée',                   'GC504','GC','S5','Bachelor',10, 'theorique'],
  ['Aménagement Urbain',                      'GC505','GC','S5','Bachelor',10, 'theorique'],
  ['Gestion de Chantier Avancée',            'GC506','GC','S5','Bachelor',10, 'theorique'],
  ['Stage GC Bachelor',                       'GC507','GC','S5','Bachelor',10, 'theorique'],

  // ── GE – S1 (5 dept modules) ──────────────────────────────────────────────
  ['Circuits Électriques',                    'GE101','GE','S1','DUT1',11, 'theorique'],
  ['Électronique Analogique',                'GE102','GE','S1','DUT1',11, 'theorique'],
  ['Électrocinétique & Magnétisme',          'GE103','GE','S1','DUT1',11, 'theorique'],
  ['Signaux et Systèmes',                    'GE104','GE','S1','DUT1',11, 'theorique'],
  ['Atelier Électricité',                    'GE105','GE','S1','DUT1',11, 'pratique'],
  // GE – S3 (6 dept modules)
  ['Électronique Numérique',                 'GE301','GE','S3','DUT2',11, 'theorique'],
  ['Systèmes Embarqués',                     'GE302','GE','S3','DUT2',11, 'pratique'],
  ['Instrumentation & Mesures',              'GE303','GE','S3','DUT2',11, 'theorique'],
  ['Réseaux Électriques',                    'GE304','GE','S3','DUT2',11, 'theorique'],
  ['Traitement du Signal',                   'GE305','GE','S3','DUT2',11, 'theorique'],
  ['Systèmes de Contrôle Avancés',          'GE306','GE','S3','DUT2',11, 'theorique'],
  // GE – S5 (7 dept modules)
  ['Projet de Fin d\'Études GE',            'GE501','GE','S5','Bachelor',11, 'theorique'],
  ['Électronique de Puissance Avancée',     'GE502','GE','S5','Bachelor',11, 'theorique'],
  ['Véhicules Électriques',                 'GE503','GE','S5','Bachelor',11, 'theorique'],
  ['IoT & Systèmes Embarqués Avancés',     'GE504','GE','S5','Bachelor',11, 'pratique'],
  ['Smart Building',                         'GE505','GE','S5','Bachelor',11, 'theorique'],
  ['Micro-réseaux & Stockage Énergie',      'GE506','GE','S5','Bachelor',11, 'theorique'],
  ['Stage GE Bachelor',                      'GE507','GE','S5','Bachelor',11, 'theorique'],

  // ── GM – S1 (5 dept modules) ──────────────────────────────────────────────
  ['Dessin Industriel',                       'GM101','GM','S1','DUT1',12, 'theorique'],
  ['Mécanique Générale',                      'GM102','GM','S1','DUT1',12, 'theorique'],
  ['Résistance des Matériaux Intro',         'GM103','GM','S1','DUT1',12, 'theorique'],
  ['Technologie des Matériaux',              'GM104','GM','S1','DUT1',12, 'theorique'],
  ['Atelier Mécanique',                       'GM105','GM','S1','DUT1',12, 'pratique'],
  // GM – S3 (6 dept modules)
  ['Conception Assistée par Ordinateur',     'GM301','GM','S3','DUT2',12, 'pratique'],
  ['Fabrication Mécanique',                   'GM302','GM','S3','DUT2',12, 'theorique'],
  ['Méthodes des Éléments Finis',            'GM303','GM','S3','DUT2',12, 'theorique'],
  ['Technologie de Mise en Forme',           'GM304','GM','S3','DUT2',12, 'theorique'],
  ['Régulation & Automatique GM',            'GM305','GM','S3','DUT2',12, 'theorique'],
  ['Systèmes Hydrauliques',                  'GM306','GM','S3','DUT2',12, 'theorique'],
  // GM – S5 (7 dept modules)
  ['Projet de Fin d\'Études GM',            'GM501','GM','S5','Bachelor',12, 'theorique'],
  ['Conception Mécatronique',               'GM502','GM','S5','Bachelor',12, 'theorique'],
  ['Simulation Numérique',                  'GM503','GM','S5','Bachelor',12, 'pratique'],
  ['Tribologie & Lubrification',            'GM504','GM','S5','Bachelor',12, 'theorique'],
  ['Contrôle Qualité Avancé',              'GM505','GM','S5','Bachelor',12, 'theorique'],
  ['Lean Manufacturing',                    'GM506','GM','S5','Bachelor',12, 'theorique'],
  ['Stage GM Bachelor',                     'GM507','GM','S5','Bachelor',12, 'theorique'],

  // ── TM – S1 (5 dept modules) ──────────────────────────────────────────────
  ['Introduction au Management',             'TM101','TM','S1','DUT1',13, 'theorique'],
  ['Comptabilité Générale',                  'TM102','TM','S1','DUT1',13, 'theorique'],
  ['Économie Générale',                      'TM103','TM','S1','DUT1',13, 'theorique'],
  ['Statistiques Décisionnelles',            'TM104','TM','S1','DUT1',13, 'theorique'],
  ['Informatique de Gestion Intro',          'TM105','TM','S1','DUT1',13, 'theorique'],
  // TM – S3 (6 dept modules)
  ['Gestion de Projet',                      'TM301','TM','S3','DUT2',13, 'theorique'],
  ['Finance d\'Entreprise',                 'TM302','TM','S3','DUT2',13, 'theorique'],
  ['Fiscalité des Entreprises',             'TM303','TM','S3','DUT2',13, 'theorique'],
  ['Contrôle de Gestion',                   'TM304','TM','S3','DUT2',13, 'theorique'],
  ['Communication Professionnelle',          'TM305','TM','S3','DUT2',13, 'theorique'],
  ['Management des SI',                      'TM306','TM','S3','DUT2',13, 'theorique'],
  // TM – S5 (7 dept modules)
  ['Projet de Fin d\'Études TM',            'TM501','TM','S5','Bachelor',13, 'theorique'],
  ['Finance Internationale',                 'TM502','TM','S5','Bachelor',13, 'theorique'],
  ['Management Stratégique',                'TM503','TM','S5','Bachelor',13, 'theorique'],
  ['Commerce International Avancé',         'TM504','TM','S5','Bachelor',13, 'theorique'],
  ['Entrepreneuriat Social',                 'TM505','TM','S5','Bachelor',13, 'theorique'],
  ['Audit et Contrôle Interne',             'TM506','TM','S5','Bachelor',13, 'theorique'],
  ['Stage TM Bachelor',                      'TM507','TM','S5','Bachelor',13, 'theorique'],

  // ── IG – S1 (5 dept modules) ──────────────────────────────────────────────
  ['Systèmes d\'Information',               'IG101','IG','S1','DUT1',14, 'theorique'],
  ['Programmation VBA / Excel Avancé',       'IG102','IG','S1','DUT1',14, 'pratique'],
  ['Algorithmique & Bureautique',            'IG103','IG','S1','DUT1',14, 'theorique'],
  ['Comptabilité Analytique IG',            'IG104','IG','S1','DUT1',14, 'theorique'],
  ['Réseaux & Télécom Intro',              'IG105','IG','S1','DUT1',14, 'theorique'],
  // IG – S3 (6 dept modules)
  ['E-Commerce',                             'IG301','IG','S3','DUT2',14, 'theorique'],
  ['Business Intelligence IG',              'IG302','IG','S3','DUT2',14, 'theorique'],
  ['Gestion de Projet SI',                  'IG303','IG','S3','DUT2',14, 'theorique'],
  ['Développement Applications de Gestion','IG304','IG','S3','DUT2',14, 'pratique'],
  ['Sécurité des SI',                       'IG305','IG','S3','DUT2',14, 'theorique'],
  ['Urbanisme des SI',                       'IG306','IG','S3','DUT2',14, 'theorique'],
  // IG – S5 (7 dept modules)
  ['Projet de Fin d\'Études IG',           'IG501','IG','S5','Bachelor',14, 'theorique'],
  ['Cloud & SaaS pour l\'Entreprise',      'IG502','IG','S5','Bachelor',14, 'theorique'],
  ['Big Data & Décisionnel',               'IG503','IG','S5','Bachelor',14, 'theorique'],
  ['Architecture d\'Entreprise',           'IG504','IG','S5','Bachelor',14, 'theorique'],
  ['Innovation & Digital Transformation',   'IG505','IG','S5','Bachelor',14, 'theorique'],
  ['IA pour la Gestion',                   'IG506','IG','S5','Bachelor',14, 'theorique'],
  ['Stage IG Bachelor',                     'IG507','IG','S5','Bachelor',14, 'theorique'],

  // ── COMMON modules ────────────────────────────────────────────────────────
  // S1: 2 COMMON → DUT1 gets 5 dept + 2 COMMON = 7 exams
  ['Mathématiques Appliquées',               'COM101','COMMON','S1','DUT1', 3, 'theorique'],
  ['Langue Française & Communication',       'COM102','COMMON','S1','DUT1', 9, 'theorique'],
  // S3: 1 COMMON → DUT2 gets 6 dept + 1 COMMON = 7 exams
  ['Entrepreneuriat & Innovation',           'COM301','COMMON','S3','DUT2', 9, 'theorique'],
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function upsertUser(data) {
  const { email, password, ...rest } = data;
  const existing = await User.findOne({ email }).select('+password');
  if (existing) {
    console.log(`  ⏭️  Skipped (exists): ${email}`);
    return existing;
  }
  const user = new User({ email, password, ...rest });
  await user.save();
  return user;
}

async function upsertRoom(data) {
  return Room.findOneAndUpdate(
    { nom: data.nom },
    { $set: { ...data, isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED LOGIC  (assumes MongoDB is already connected)
// ─────────────────────────────────────────────────────────────────────────────

async function seedAll() {
  // ── 1. ADMINS ──────────────────────────────────────────────────────────────
  console.log('👑 Création des admins...');
  for (const a of ADMINS) await upsertUser(a);
  console.log(`✅ ${ADMINS.length} admins OK\n`);

  // ── 2. PROFESSORS ──────────────────────────────────────────────────────────
  console.log('👨‍🏫 Création des professeurs...');
  const profDocs = [];
  for (const p of PROFESSORS) {
    const doc = await upsertUser({ ...p, role: 'professeur', password: 'prof123' });
    profDocs.push(doc);
  }
  console.log(`✅ ${profDocs.length} professeurs OK\n`);

  // ── 3. STUDENTS (delete all first, recreate with Moroccan names) ───────────
  console.log('🎓 Suppression des anciens étudiants...');
  await User.deleteMany({ role: 'etudiant' });
  await Exam.deleteMany({});
  console.log('✅ Anciens étudiants et examens supprimés\n');

  console.log('🎓 Création des étudiants avec noms marocains...');
  let totalStudents = 0;
  let nameIdx = 0;
  const hashed = await bcrypt.hash('student123', 12);

  for (const [dept, niveau, count, prefix, year] of STUDENT_COHORTS) {
    const batch = [];
    for (let i = 1; i <= count; i++) {
      const isMale  = (nameIdx % 2 === 0);
      const prenom  = isMale
        ? MALE_PRENOMS[Math.floor(nameIdx / 2) % MALE_PRENOMS.length]
        : FEMALE_PRENOMS[Math.floor(nameIdx / 2) % FEMALE_PRENOMS.length];
      const name    = NOMS[(nameIdx * 3 + 7) % NOMS.length];
      const safeP   = normalizeEmail(prenom);
      const safeN   = normalizeEmail(name);
      // Use unique cohort prefix (gi24, gc23, etc.) to prevent cross-cohort collisions
      const email   = `${safeP}.${safeN}.${prefix}${i}@edu.uca.ma`;

      batch.push({
        name, prenom, email,
        password:        hashed,
        role:            'etudiant',
        numero_etudiant: `${prefix.toUpperCase()}${year}${String(i).padStart(3,'0')}`,
        departement:     dept,
        niveau,
        isActive:        true,
      });
      nameIdx++;
    }

    try {
      const result = await User.insertMany(batch, { ordered: false });
      totalStudents += result.length;
    } catch (e) {
      if (e.code === 11000 || e.writeErrors) {
        totalStudents += (e.insertedDocs || []).length;
      } else throw e;
    }
    console.log(`  ✅ ${dept}-${niveau}: ${count} étudiants`);
  }
  console.log(`✅ Total étudiants: ${totalStudents}\n`);

  // ── 4. ROOMS ───────────────────────────────────────────────────────────────
  console.log('🏫 Création des salles...');
  for (const r of ROOMS) await upsertRoom(r);
  console.log(`✅ ${ROOMS.length} salles OK\n`);

  // ── 5. MODULES ─────────────────────────────────────────────────────────────
  console.log('📚 Création des modules...');
  let modCreated = 0;
  for (const [name, code, dept, sem, niv, profIdx, examType] of MODULE_TEMPLATES) {
    const prof = profDocs[profIdx];
    if (!prof) { console.warn(`  ⚠️  profIdx ${profIdx} hors limites pour ${code}`); continue; }
    await Module.findOneAndUpdate(
      { code },
      { $set: { name, code, department: dept, semester: sem, niveau: niv, professor: prof._id, examType } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    modCreated++;
  }
  console.log(`✅ ${modCreated} modules OK\n`);

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  const [uCount, rCount, mCount, eCount] = await Promise.all([
    User.countDocuments(), Room.countDocuments(),
    Module.countDocuments(), Exam.countDocuments(),
  ]);
  const adminsCount = await User.countDocuments({ role: 'admin' });
  const profsCount  = await User.countDocuments({ role: 'professeur' });
  const studsCount  = await User.countDocuments({ role: 'etudiant' });

  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉  BASE DE DONNÉES PEUPLÉE AVEC SUCCÈS !');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  👑 Admins       : ${adminsCount}`);
  console.log(`  👨‍🏫 Professeurs  : ${profsCount}`);
  console.log(`  🎓 Étudiants    : ${studsCount}`);
  console.log(`  🏫 Salles       : ${rCount}`);
  console.log(`  📚 Modules      : ${mCount}`);
  console.log(`  📝 Examens      : ${eCount}`);
  console.log(`  👥 Total users  : ${uCount}`);
  console.log('═══════════════════════════════════════════════════════\n');

  return { admins: adminsCount, professors: profsCount, students: studsCount,
           rooms: rCount, modules: mCount, exams: eCount, total: uCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const URI = process.env.MONGODB_URI;
  if (!URI) { console.error('❌  MONGODB_URI manquante dans .env'); process.exit(1); }

  mongoose.connect(URI)
    .then(async () => {
      console.log('✅ MongoDB connecté\n');
      if (process.argv.includes('--reset')) {
        await Promise.all([User.deleteMany({}), Room.deleteMany({}),
                           Module.deleteMany({}), Exam.deleteMany({})]);
        console.log('🗑️  Collections nettoyées\n');
      }
      return seedAll();
    })
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch(err => { console.error('❌  Seed failed:', err.message); process.exit(1); });
}

module.exports = seedAll;
