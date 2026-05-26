const router = require('express').Router();
const ctrl = require('../controllers/loanController');

router.get('/',                     ctrl.getAll);
router.get('/:id',                  ctrl.getById);
router.post('/',                    ctrl.create);
router.put('/:id/status',           ctrl.updateStatus);
router.get('/:id/terms',            ctrl.getTermDetails);
router.post('/:id/terms',           ctrl.addTermDetail);
router.get('/:id/emis',             ctrl.getEMIs);

module.exports = router;