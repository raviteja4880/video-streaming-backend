  require('dotenv').config();
  const path = require('path');
  const express = require('express');
  const mongoose = require('mongoose');
  const cors = require('cors');
  const morgan = require('morgan');

  const routes = require('./src/routes');         
  const userRoutes = require('./src/routes/userRoutes');
  const historyRoutes = require("./src/routes/historyRoutes.js");

  const app = express();

  app.set('trust proxy', true);

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '1000mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  // Serve static files
  app.use('/uploads/videos', express.static(path.join(__dirname, 'uploads', 'videos')));
  app.use('/uploads/images', express.static(path.join(__dirname, 'uploads', 'images')));

  // Routes
  app.use('/api/users', userRoutes);
  app.use('/api/history', historyRoutes);
  app.use('/api', routes);  

  // Health check
  app.get('/health', (req, res) => res.json({ ok: true }));

  // Catch any unhandled route
  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  // Centralized error handler
  app.use((err, req, res, next) => {
    console.error('Internal Server Error:', err);
    res.status(500).json({
      message: err.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  });

  // MongoDB connection
  const MONGO_URI = process.env.MONGO_URI;
  mongoose
    .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      console.log('MongoDB connected');
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err.message);
      process.exit(1);
    });
