const express = require('express');
const AuthController = require('../controllers/authController');

const createAuthRoutes = (authService) => {
  const router = express.Router();
  const authController = new AuthController(authService);

  // Authentication routes
  router.post('/login', authController.login);
  router.post('/register', authController.register);
  router.post('/verify', authController.verifyToken);

  return router;
};

module.exports = createAuthRoutes;