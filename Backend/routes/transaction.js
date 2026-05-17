const router = require('express').Router();
const ctrl = require('../controllers/transactionController');

router.get('/',                       ctrl.getAll);
router.get('/:id',                    ctrl.getById);
router.post('/transfer',              ctrl.transfer);
router.post('/',                      ctrl.create);
router.get('/customer/:custId',       ctrl.getByCustomer);

module.exports = router;