const express = require('express');
const auth = require('../middleware/auth');
const {addToHistory, getHistory, clearHistory, deleteHistoryItem,} = require ("../controllers/historyController.js");

const router = express.Router();

router.post("/:videoId", auth, addToHistory);

router.get("/", auth, getHistory);

router.delete("/item/:id", auth, deleteHistoryItem);

router.delete("/", auth, clearHistory);

module.exports = router;
