const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.json({ message: 'API OK' }));

router.use('/users', require('./userRoutes'));
router.use('/videos', require('./videoRoutes'));
router.use('/comments', require('./commentRoutes'));

module.exports = router;
