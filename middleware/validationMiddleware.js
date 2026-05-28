const { body, validationResult } = require('express-validator');

// ── Run validators and return 400 if any errors ──────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides.',
      errors: errors.array().map(e => ({ field: e.path, msg: e.msg })),
    });
  }
  next();
};

// ── Login ─────────────────────────────────────────────────────────────────────
const validateLogin = [
  body('email').isEmail().withMessage('Email invalide.').normalizeEmail(),
  body('password').notEmpty().withMessage('Mot de passe requis.'),
  validate,
];

// ── Register / create user ────────────────────────────────────────────────────
const validateRegister = [
  body('name').notEmpty().withMessage('Prénom requis.'),
  body('prenom').notEmpty().withMessage('Nom requis.'),
  body('email').isEmail().withMessage('Email invalide.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe : 6 caractères minimum.'),
  body('role').isIn(['admin', 'professeur', 'etudiant']).withMessage('Rôle invalide.'),
  validate,
];

module.exports = { validate, validateLogin, validateRegister };
