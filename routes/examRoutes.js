const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Student: their exams (by dept+niveau)
router.get('/my-exams', examController.getMyExams);
// Professor: their supervisions
router.get('/my-supervisions', examController.getMySupervisions);

// Admin routes
router.get('/', roleMiddleware(['admin']), examController.getAllExams);
router.post('/', roleMiddleware(['admin']), examController.createExam);
router.post('/assign', roleMiddleware(['admin']), examController.assignStudent);
router.delete('/remove', roleMiddleware(['admin']), examController.removeStudent);
router.get('/student/:studentId', roleMiddleware(['admin']), examController.getStudentExams);
router.get('/professor/:professorId', roleMiddleware(['admin', 'professeur']), examController.getProfessorExams);

// Shared (must be after specific routes)
router.get('/:id', examController.getExamById);
router.put('/:id', roleMiddleware(['admin']), examController.updateExam);
router.delete('/:id', roleMiddleware(['admin']), examController.deleteExam);

module.exports = router;
