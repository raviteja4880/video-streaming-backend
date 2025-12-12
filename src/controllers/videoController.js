const Video = require('../models/Video');
const { cloudinary } = require('../config/storage');

// 1. Get all videos (Feed)
exports.feed = async (req, res) => {
  try {
    const videos = await Video.find()
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Get one video by ID
exports.getOne = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('user', 'name avatar');
    if (!video) return res.status(404).json({ message: 'Video not found' });
    res.json(video);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Upload video
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No video file uploaded' });

    // Upload video to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video",
    });

    // Generate a video thumbnail URL using Cloudinary transformation
    const publicId = uploadResult.public_id;
    const thumbnailUrl = cloudinary.url(publicId + ".jpg", {
      resource_type: "video",
      format: "jpg",
      transformation: [{ width: 640, height: 360, crop: "fill", quality: "auto" }],
    });

    const video = new Video({
      user: req.user._id,
      title: req.body.title,
      description: req.body.description,
      url: uploadResult.secure_url,
      thumbnail: thumbnailUrl,
      duration: Math.floor(uploadResult.duration) || 0,
    });

    await video.save();
    res.status(201).json({ message: 'Video uploaded successfully', video });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ message: err.message });
  }
};

// 4. Toggle Like
exports.toggleLike = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    // Support both logged-in users and guests
    const likerId = req.user?._id?.toString() || req.viewerId;
    if (!likerId) return res.status(400).json({ message: "Missing liker ID" });

    const index = video.likes.findIndex((id) => id === likerId);

    if (index === -1) {
      video.likes.push(likerId);
    } else {
      video.likes.splice(index, 1);
    }

    await video.save();
    res.json({
      message: "Like toggled",
      likesCount: video.likes.length,
      likedByUser: index === -1,
    });
  } catch (err) {
    console.error("Toggle like failed:", err);
    res.status(500).json({ message: err.message });
  }
};

// 5. Share video (dummy logic)
exports.share = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    // Increment share count
    video.shares = (video.shares || 0) + 1;
    await video.save();

    res.json({
      message: "Share link generated",
      shareLink: `${process.env.FRONTEND_URL || "http://localhost:5173"}/video/${video._id}`,
      shares: video.shares,
    });
  } catch (err) {
    console.error("Share failed:", err);
    res.status(500).json({ message: err.message });
  }
};

// 6. Get current user's videos
exports.getMyVideos = async (req, res) => {
  try {
    const videos = await Video.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 7. Update title/description
exports.updateVideo = async (req, res) => {
  try {
    const { title, description } = req.body;
    const video = await Video.findOne({ _id: req.params.id, user: req.user._id });
    if (!video) return res.status(404).json({ message: 'Video not found' });

    if (title) video.title = title;
    if (description) video.description = description;
    await video.save();
    res.json({ message: 'Video updated successfully', video });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 8. Update thumbnail
exports.updateThumbnail = async (req, res) => {
  try {
    const video = await Video.findOne({ _id: req.params.id, user: req.user._id });
    if (!video) return res.status(404).json({ message: 'Video not found' });

    video.thumbnail = req.file.path;
    await video.save();
    res.json({ message: 'Thumbnail updated successfully', video });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 9. Delete video
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findOne({ _id: req.params.id, user: req.user._id });
    if (!video) return res.status(404).json({ message: 'Video not found' });

    try {
      const publicId = video.url.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`streamify/videos/${publicId}`, { resource_type: 'video' });
    } catch (e) {
      console.warn('Cloudinary delete failed:', e.message);
    }

    await video.deleteOne();
    res.json({ message: 'Video deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 10. View count increment
exports.addView = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    // Determine unique viewer identity
    const userId =
      req.user?._id?.toString() || req.viewerId || req.ip || "unknown";

    // Add view only if not already counted
    if (!video.viewsBy.includes(userId)) {
      video.viewsBy.push(userId);
      video.views += 1;

      // Trim old entries to avoid large arrays
      if (video.viewsBy.length > 5000) {
        video.viewsBy = video.viewsBy.slice(-3000);
      }

      await video.save();
    } else {
      console.log("View already counted for viewer:", userId);
    }
    res.json({ views: video.views });
  } catch (err) {
    console.error("View update failed:", err);
    res.status(500).json({ message: err.message });
  }
};

// 11. Add Watch Time and Update User History
exports.addWatchTime = async (req, res) => {
  try {
    const { secondsWatched } = req.body;
    if (!secondsWatched || secondsWatched <= 0)
      return res.status(400).json({ message: "Invalid watch time" });

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    // --- Total Watch Time ---
    video.totalWatchTime = (video.totalWatchTime || 0) + Number(secondsWatched);

    // --- Logged-in User or Guest ---
    if (req.user) {
      video.userWatchTime = (video.userWatchTime || 0) + Number(secondsWatched);
      video.userViews = Math.max(video.userViews || 0, 1);
      console.log(
        `[WATCH] USER ${req.user._id} watched ${secondsWatched}s on ${video.title}`
      );
    } else if (req.viewerId) {
      video.guestWatchTime = (video.guestWatchTime || 0) + Number(secondsWatched);
      video.guestViews = Math.max(video.guestViews || 0, 1);
      console.log(
        `[WATCH] GUEST ${req.viewerId} watched ${secondsWatched}s on ${video.title}`
      );
    }

    // --- Safe Avg Calculation ---
    video.views = Math.max(video.views || 0, 1);
    video.avgWatchTime = Number(
      (video.totalWatchTime / video.views).toFixed(2)
    );

    await video.save();

    // ---  If logged in, update watch history ---
    if (req.user) {
      const History = require("../models/History");
      const userId = req.user._id;

      let history = await History.findOne({ user: userId, videoId: video._id });
      if (!history) {
        history = new History({
          user: userId,
          videoId: video._id,
          title: video.title,
          url: video.url,
          thumbnail: video.thumbnail,
          watchedSeconds: 0,
          totalDuration: video.duration || 0,
        });
      }

      const currentDuration = video.duration || 0;
      const newWatchedSeconds = Math.min(
        history.watchedSeconds + secondsWatched,
        currentDuration > 0 ? currentDuration : Number.MAX_SAFE_INTEGER
      );

      history.watchedSeconds = newWatchedSeconds;
      history.totalDuration = currentDuration;
      history.watchedAt = new Date();

      await history.save();
    }

    // ---  Respond with updated stats ---
    return res.json({
      message: "Watch time updated successfully",
      totalWatchTime: video.totalWatchTime,
      userWatchTime: video.userWatchTime,
      guestWatchTime: video.guestWatchTime,
      avgWatchTime: video.avgWatchTime,
    });
  } catch (err) {
    console.error("WatchTime update failed:", err);
    res.status(500).json({ message: err.message });
  }
};
