const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { validateRoom } = require('../middleware/validationMiddleware');

router.use(authMiddleware);

router.get('/', roomController.getAllRooms);
router.get('/availability', roomController.checkAvailability);
router.get('/:id', roomController.getRoomById);
router.get('/:id/exams', roomController.getRoomExams);
router.post('/', roleMiddleware(['admin']), validateRoom, roomController.createRoom);
router.put('/:id', roleMiddleware(['admin']), roomController.updateRoom);
router.delete('/:id', roleMiddleware(['admin']), roomController.deleteRoom);

module.exports = router;
