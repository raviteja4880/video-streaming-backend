const express = require('express');
const auth = require('../middleware/auth');
const { getMe, updateProfile, uploadAvatar } = require('../controllers/userController');
const { uploadImage } = require('../config/storage'); 
const router = express.Router();

router.get('/me', auth, getMe);
router.put('/me', auth, updateProfile);
router.post('/me/avatar', auth, uploadImage.single('avatar'), uploadAvatar);


module.exports = router;
