const router = require('express').Router();
const ctrl = require('../controllers/recurringDepositController');
const { verifyToken } = require('../middleware/auth');

router.get('/:custId', verifyToken, ctrl.getByCustId);
router.post('/:custId', verifyToken, ctrl.create);

module.exports = router;
