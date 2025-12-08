exports.getMe = async (req, res) => {
  res.json(req.user);
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, avatar, bio } = req.body;

    if (name !== undefined) req.user.name = name;
    if (avatar !== undefined) req.user.avatar = avatar;
    if (bio !== undefined) req.user.bio = bio;

    await req.user.save();
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// New: Upload avatar and update user profile
exports.uploadAvatar = async (req, res, next) => {
  try {
    console.log('🟢 Incoming upload request...');
    console.log('File info:', req.file);
    console.log('User info:', req.user);

    if (!req.file) {
      throw new Error('No file received. Check your Postman form-data key (must be "avatar").');
    }

    req.user.avatar = req.file.path; // Cloudinary returns full URL in .path
    await req.user.save();

    res.json({
      success: true,
      avatar: req.user.avatar,
      message: 'Avatar uploaded successfully!',
    });
  } catch (err) {
    console.error('❌ Upload failed:', err);
    next(err); // Let global error handler return JSON
  }
};
