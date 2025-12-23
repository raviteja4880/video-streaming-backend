const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, 
});

// Storage for images (avatars, thumbnails, etc.)
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'streamify/images',
    resource_type: 'image',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    public_id: (req, file) => {
      const base = (file.originalname || 'image')
        .replace(/\.[^/.]+$/, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
      return `${Date.now()}-${base}`;
    },
  },
});

// Storage for videosn
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'streamify/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'mkv'],
    public_id: (req, file) => {
      const base = (file.originalname || 'video')
        .replace(/\.[^/.]+$/, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
      return `${Date.now()}-${base}`;
    },
  },
});

const uploadImage = multer({ storage: imageStorage });
const uploadVideo = multer({ storage: videoStorage });

module.exports = { uploadImage, uploadVideo, cloudinary };
