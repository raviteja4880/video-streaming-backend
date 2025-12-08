const Comment = require('../models/Comment');

// List comments
exports.list = async (req, res) => {
  try {
    const { videoId } = req.params;
    const comments = await Comment.find({ video: videoId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add a new comment
exports.add = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { text } = req.body;

    const newComment = await Comment.create({
      user: req.user._id,
      video: videoId,
      text,
    });

    // populate user details for instant display
    const populated = await newComment.populate('user', 'name avatar');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a comment 
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const c = await Comment.findById(id);

    if (!c) return res.status(404).json({ message: 'Comment not found' });

    // Ownership check
    const isOwner = c.user.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ message: 'Not authorized' });

    await c.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
