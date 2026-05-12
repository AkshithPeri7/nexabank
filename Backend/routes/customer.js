const router = require('express').Router();
const ctrl = require('../controllers/customerController');
const { verifyToken } = require('../middleware/auth');

router.get('/',        ctrl.getAll);
router.get('/:id',     ctrl.getById);
router.post('/',       ctrl.create);
router.put('/:id',     ctrl.update);
router.patch('/:id/contact', verifyToken, ctrl.updateContact);
router.delete('/:id',  ctrl.remove);

module.exports = router;