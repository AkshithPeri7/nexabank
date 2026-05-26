const router = require('express').Router();
const ctrl = require('../controllers/fixedDepositController');

router.get('/:custId', ctrl.getFDs);
router.post('/:custId', ctrl.createFD);

module.exports = router;
