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

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video",
    });

    // Generate thumbnail
    const publicId = uploadResult.public_id;
    const thumbnailUrl = cloudinary.url(publicId, {
      resource_type: "video",
      format: "jpg",
      secure: true, 
      transformation: [
        { width: 640, height: 360, crop: "fill", quality: "auto" }
      ],
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
    if (!video)
      return res.status(404).json({ message: "Video not found" });

    const likerId =
      req.user?._id?.toString() || req.body.viewerId;

    if (!likerId)
      return res.status(400).json({ message: "Missing liker ID" });

    const index = video.likes.findIndex(
      (id) => id.toString() === likerId
    );

    let liked;
    if (index === -1) {
      video.likes.push(likerId);
      liked = true;
    } else {
      video.likes.splice(index, 1);
      liked = false;
    }

    await video.save();

    res.json({
      message: liked ? "Liked" : "Unliked",
      likesCount: video.likes.length,
      liked,
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

    const viewerId =
      req.user?._id?.toString() ||
      req.body.viewerId ||
      req.ip;

    if (!viewerId) {
      return res.status(400).json({ message: "Missing viewer ID" });
    }

    if (!video.viewsBy.includes(viewerId)) {
      video.viewsBy.push(viewerId);

      // REAL VIEW COUNT
      video.views += 1;

      // SPLIT USER / GUEST VIEWS
      if (req.user) {
        video.userViews = (video.userViews || 0) + 1;
      } else {
        video.guestViews = (video.guestViews || 0) + 1;
      }

      // prevent unbounded growth
      if (video.viewsBy.length > 5000) {
        video.viewsBy = video.viewsBy.slice(-3000);
      }

      await video.save();
    }

    res.json({
      views: video.views,
      userViews: video.userViews,
      guestViews: video.guestViews,
    });
  } catch (err) {
    console.error("View update failed:", err);
    res.status(500).json({ message: err.message });
  }
};

// 11. Add Watch Time and Update User History
exports.addWatchTime = async (req, res) => {
  try {
    const { secondsWatched } = req.body;
    if (!secondsWatched || secondsWatched <= 0) {
      return res.status(400).json({ message: "Invalid watch time" });
    }

    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // TOTAL WATCH TIME
    video.totalWatchTime =
      (video.totalWatchTime || 0) + Number(secondsWatched);

    // USER / GUEST WATCH TIME
    if (req.user) {
      video.userWatchTime =
        (video.userWatchTime || 0) + Number(secondsWatched);
    } else {
      video.guestWatchTime =
        (video.guestWatchTime || 0) + Number(secondsWatched);
    }

    // AVG WATCH TIME (BASED ON REAL VIEWS)
    const safeViews = Math.max(video.views || 1, 1);
    video.avgWatchTime = Number(
      (video.totalWatchTime / safeViews).toFixed(2)
    );

    await video.save();

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

// 12. Get Video Analytics
exports.getVideoAnalytics = async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      user: req.user._id 
    });

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.json({
      title: video.title,

      views: video.views,
      userViews: video.userViews,
      guestViews: video.guestViews,

      likes: video.likes.length,
      shares: video.shares,

      totalWatchTime: video.totalWatchTime,
      avgWatchTime: video.avgWatchTime,

      userWatchTime: video.userWatchTime,
      guestWatchTime: video.guestWatchTime,

      createdAt: video.createdAt
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ message: "Failed to load analytics" });
  }
};
