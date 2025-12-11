const History = require ("../models/History.js");
const Video = require ("../models/Video.js");

// Add to history
exports.addToHistory = async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const userId = req.user?._id;

    if (!userId)
      return res.status(401).json({ message: "Login required to save history" });

    if (!videoId)
      return res.status(400).json({ message: "Missing videoId in request" });

    const video = await Video.findById(videoId);
    if (!video)
      return res.status(404).json({ message: "Video not found" });

    // Upsert history entry without redundant data
    const history = await History.findOneAndUpdate(
      { user: userId, videoId },
      {
        $set: {
          watchedAt: new Date(),
          totalDuration: video.duration || 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ message: "Added to history successfully", history });
  } catch (err) {
    console.error("Add to history error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get user's history
exports.getHistory = async (req, res) => {
  try {
    const history = await History.find({ user: req.user._id })
      .populate("videoId", "title url thumbnail duration createdAt")
      .sort({ watchedAt: -1 });

    const formatted = history.map((h) => {
      const video = h.videoId || {};

      // Handle deleted or missing videos gracefully
      const url = video.url || "";
      const hasCloudinary = url.includes("/upload/");

      // Auto-thumbnail fallback (Cloudinary frame or local placeholder)
      const fallbackThumbnail = hasCloudinary
        ? url
            .replace("/upload/", "/upload/so_1/")
            .replace(/\.(mp4|mov|avi|webm)$/i, ".jpg")
        : "/assets/default-thumbnail.jpg";

      return {
        _id: h._id,
        videoId: video._id || h.videoId, 
        title: video.title || "Deleted or Unavailable Video",
        url,
        thumbnail: video.thumbnail || fallbackThumbnail,
        totalDuration: h.totalDuration || 0,
        watchedSeconds: h.watchedSeconds || 0,
        watchedAt: h.watchedAt,
      };
    });

    return res.json(formatted);
  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ message: "Failed to fetch history" });
  }
};


// Delete a single video
exports.deleteHistoryItem = async (req, res) => {
  try {
    const item = await History.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete history item error:", err);
    res.status(500).json({ message: "Failed to delete history item" });
  }
};

// Clear entire history
exports.clearHistory = async (req, res) => {
  try {
    await History.deleteMany({ user: req.user._id });
    res.json({ success: true, message: "History cleared" });
  } catch (err) {
    console.error("Clear history error:", err);
    res.status(500).json({ message: "Failed to clear history" });
  }
};
