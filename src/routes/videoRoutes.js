const express = require('express');
const auth = require('../middleware/auth');
const { uploadVideo, uploadImage } = require('../config/storage');
const {
  feed,
  getOne,
  uploadVideo: uploadController,
  deleteVideo,
  toggleLike,
  share,
  getMyVideos,
  updateVideo,
  updateThumbnail,
} = require('../controllers/videoController');

const router = express.Router();

router.get('/mine', auth, getMyVideos);
router.get('/', feed);
router.get('/:id', getOne);

router.post('/', auth, uploadVideo.single('video'), uploadController);
router.put('/:id', auth, updateVideo);
router.put('/:id/thumbnail', auth, uploadImage.single('thumbnail'), updateThumbnail);

router.post('/:id/like', auth, toggleLike);
router.post('/:id/share', auth, share);
router.delete('/:id', auth, deleteVideo);

module.exports = router;
