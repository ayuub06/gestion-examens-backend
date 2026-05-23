const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { validateLogin, validateRegister } = require('../middleware/validationMiddleware');

// Public routes
router.post('/login', validateLogin, authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPasswordByToken);
router.post('/refresh-token', authController.refreshToken);

// Protected routes (any authenticated user)
router.get('/me', authMiddleware, authController.getMe);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/change-password', authMiddleware, authController.changePassword);

// Admin-only routes
router.get('/users', authMiddleware, roleMiddleware(['admin']), authController.getAllUsers);
router.post('/register', authMiddleware, roleMiddleware(['admin']), validateRegister, authController.register);
router.post('/admin/create-user', authMiddleware, roleMiddleware(['admin']), authController.adminCreateUser);
router.put('/users/:id', authMiddleware, roleMiddleware(['admin']), authController.updateUser);
router.delete('/users/:id', authMiddleware, roleMiddleware(['admin']), authController.deleteUser);
router.put('/users/:id/reset-password', authMiddleware, roleMiddleware(['admin']), authController.resetPassword);

module.exports = router;
