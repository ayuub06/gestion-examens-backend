const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { validateModule } = require('../middleware/validationMiddleware');

router.use(authMiddleware);

router.get('/', moduleController.getAllModules);
router.get('/:id', moduleController.getModuleById);
router.post('/', roleMiddleware(['admin']), validateModule, moduleController.createModule);
router.put('/:id', roleMiddleware(['admin']), moduleController.updateModule);
router.delete('/:id', roleMiddleware(['admin']), moduleController.deleteModule);

module.exports = router;
