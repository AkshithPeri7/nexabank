const router = require('express').Router();
const authCtrl = require('../controllers/authController');

router.post('/signup', authCtrl.signup);
router.post('/login', authCtrl.login);
router.post('/google', authCtrl.googleLogin);

module.exports = router;
