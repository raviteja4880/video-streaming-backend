const express = require('express');
const auth = require('../middleware/auth');
const { uploadImage } = require('../config/storage'); 
const { getMe, updateProfile, uploadAvatar, removeAvatar } = require('../controllers/userController');
const { register, login, verifyOtp, resendOtp, forgotPassword, resetPassword } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/me', auth, getMe);
router.put('/me', auth, updateProfile);
router.post('/me/avatar', auth, uploadImage.single('avatar'), uploadAvatar);
router.delete('/me/avatar', auth, removeAvatar);

module.exports = router;
