const Video = require('../models/Video');
const { cloudinary } = require('../config/storage');

// =============================
// 📺 1. Get all videos (Feed)
// =============================
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

// =============================
// 🎬 2. Get one video by ID
// =============================
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

// =============================
// ⬆️ 3. Upload video
// =============================
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No video file uploaded' });

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'video',
      folder: 'streamify/videos',
    });

    const video = new Video({
      user: req.user._id,
      title: req.body.title || 'Untitled Video',
      description: req.body.description || '',
      url: result.secure_url,
      thumbnail: req.body.thumbnail || '',
    });

    await video.save();
    res.status(201).json({ message: '🎥 Video uploaded successfully', video });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ message: err.message });
  }
};

// =============================
// ❤️ 4. Toggle Like
// =============================
exports.toggleLike = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const userId = req.user._id;
    const index = video.likes.indexOf(userId);

    if (index === -1) {
      video.likes.push(userId);
    } else {
      video.likes.splice(index, 1);
    }

    await video.save();
    res.json({ message: '👍 Like toggled', likesCount: video.likes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =============================
// 📤 5. Share video (dummy logic)
// =============================
exports.share = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    // Placeholder: In real app, track share count or generate share link
    res.json({
      message: '🔗 Share link generated',
      shareLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/videos/${video._id}`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =============================
// 📁 6. Get current user's videos
// =============================
exports.getMyVideos = async (req, res) => {
  try {
    const videos = await Video.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =============================
// 📝 7. Update title/description
// =============================
exports.updateVideo = async (req, res) => {
  try {
    const { title, description } = req.body;
    const video = await Video.findOne({ _id: req.params.id, user: req.user._id });
    if (!video) return res.status(404).json({ message: 'Video not found' });

    if (title) video.title = title;
    if (description) video.description = description;
    await video.save();
    res.json({ message: '✅ Video updated successfully', video });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =============================
// 🖼️ 8. Update thumbnail
// =============================
exports.updateThumbnail = async (req, res) => {
  try {
    const video = await Video.findOne({ _id: req.params.id, user: req.user._id });
    if (!video) return res.status(404).json({ message: 'Video not found' });

    video.thumbnail = req.file.path;
    await video.save();
    res.json({ message: '🖼️ Thumbnail updated successfully', video });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =============================
// 🗑️ 9. Delete video
// =============================
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findOne({ _id: req.params.id, user: req.user._id });
    if (!video) return res.status(404).json({ message: 'Video not found' });

    try {
      const publicId = video.url.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`streamify/videos/${publicId}`, { resource_type: 'video' });
    } catch (e) {
      console.warn('⚠️ Cloudinary delete failed:', e.message);
    }

    await video.deleteOne();
    res.json({ message: '🗑️ Video deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
