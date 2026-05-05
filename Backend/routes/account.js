const router = require('express').Router();
const ctrl = require('../controllers/accountController');

router.get('/',                    ctrl.getAll);
router.get('/:id',                 ctrl.getById);
router.post('/',                   ctrl.create);
router.put('/:id/balance',         ctrl.updateBalance);
router.get('/:id/holders',         ctrl.getHolders);
router.post('/:id/holders',        ctrl.addHolder);

module.exports = router;