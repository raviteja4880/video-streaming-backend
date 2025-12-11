const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
  totalDuration: { type: Number, default: 0 },
  watchedSeconds: { type: Number, default: 0 },
  watchedAt: { type: Date, default: Date.now },
});

historySchema.index({ user: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model("History", historySchema);
