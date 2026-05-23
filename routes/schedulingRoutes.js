const express = require('express');
const router = express.Router();
const schedulingController = require('../controllers/schedulingController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', schedulingController.getSchedule);
router.post('/auto-generate', roleMiddleware(['admin']), schedulingController.autoGenerateSchedule);
router.post('/manual', roleMiddleware(['admin']), schedulingController.scheduleExam);
router.post('/check-availability', schedulingController.checkAvailability);

module.exports = router;
