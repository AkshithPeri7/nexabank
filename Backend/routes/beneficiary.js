const router = require('express').Router();
const ctrl = require('../controllers/beneficiaryController');

router.get('/:custId', ctrl.getBeneficiaries);
router.post('/:custId', ctrl.addBeneficiary);
router.delete('/:benId', ctrl.deleteBeneficiary);

module.exports = router;
