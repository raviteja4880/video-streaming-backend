const express = require('express');
const auth = require('../middleware/auth');
const { list, add, remove } = require('../controllers/commentController');
const router = express.Router();

router.get('/:videoId', list);
router.post('/:videoId', auth, add);
router.delete('/item/:id', auth, remove);

module.exports = router;
