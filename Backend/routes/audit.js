const router = require('express').Router();
const ctrl = require('../controllers/auditController');

router.get('/',                    ctrl.getAll);
router.get('/transaction/:txnId',  ctrl.getByTransaction);
router.post('/',                   ctrl.create);

module.exports = router;