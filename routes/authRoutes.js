const express = require('express');
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware');

const createAuthRoutes = (authService, feedbackService = null) => {
  const router = express.Router();
  const authController = new AuthController(authService, feedbackService);

  router.post('/login', authController.login);
  router.post('/register', authController.register);
  router.post('/verify', authController.verifyToken);

  router.get('/profile', authenticateToken, authController.getUserProfile);

  return router;
};

module.exports = createAuthRoutes;