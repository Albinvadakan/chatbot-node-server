const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const setupMiddleware = (app) => {
  // CORS configuration - allow multiple origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    process.env.CORS_ORIGIN
  ].filter(Boolean); // Remove any undefined values

  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // Global error handler
  app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  });
};

module.exports = { setupMiddleware, authenticateToken };