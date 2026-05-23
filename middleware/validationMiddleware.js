const { body, validationResult } = require('express-validator');

// Reusable handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

exports.validateLogin = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').notEmpty().withMessage('Mot de passe requis'),
  validate,
];

exports.validateRegister = [
  body('name').trim().notEmpty().withMessage('Prénom requis'),
  body('prenom').trim().notEmpty().withMessage('Nom requis'),
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe ≥ 6 caractères'),
  body('role')
    .optional()
    .isIn(['admin', 'professeur', 'etudiant'])
    .withMessage('Rôle invalide'),
  validate,
];

exports.validateExam = [
  body('module').trim().notEmpty().withMessage('Module requis'),
  body('date').isISO8601().withMessage('Date invalide'),
  body('heure_debut').matches(/^\d{2}:\d{2}$/).withMessage('Heure début invalide (HH:MM)'),
  body('heure_fin').matches(/^\d{2}:\d{2}$/).withMessage('Heure fin invalide (HH:MM)'),
  body('salle').isMongoId().withMessage('Salle invalide'),
  body('surveillant').isMongoId().withMessage('Surveillant invalide'),
  validate,
];

exports.validateRoom = [
  body('nom').trim().notEmpty().withMessage('Nom de salle requis'),
  body('capacite').isInt({ min: 1 }).withMessage('Capacité doit être ≥ 1'),
  body('batiment').trim().notEmpty().withMessage('Bâtiment requis'),
  body('etage').isInt({ min: 0 }).withMessage('Étage invalide'),
  validate,
];

exports.validateModule = [
  body('name').trim().notEmpty().withMessage('Nom du module requis'),
  body('code').trim().notEmpty().withMessage('Code module requis'),
  body('department').isIn(['GI', 'IDS', 'BigData', 'COMMON']).withMessage('Département invalide'),
  body('semester').isIn(['S1', 'S2', 'S3', 'S4', 'S5', 'S6']).withMessage('Semestre invalide'),
  body('professor').isMongoId().withMessage('Professeur invalide'),
  validate,
];
