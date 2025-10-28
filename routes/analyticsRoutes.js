const express = require('express');
const AnalyticsController = require('../controllers/analyticsController');

/**
 * Creates analytics routes
 * @param {AnalyticsService} analyticsService - Analytics service instance
 * @param {AuthService} authService - Auth service for authentication middleware
 * @returns {Router} Express router
 */
function createAnalyticsRoutes(analyticsService, authService) {
  const router = express.Router();
  const controller = new AnalyticsController(analyticsService);

  const authenticateTokenOptional = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    try {
      const decoded = authService.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      return next();
    }
  };

  const authenticateTokenRequired = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    try {
      const decoded = authService.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  };

  router.post('/analytics/feedback', controller.updateFeedback);

  router.get('/analytics/user/:userId', controller.getUserSummary);

  router.get('/analytics/all-users', controller.getAllUsersSummary);

  return router;
}

module.exports = createAnalyticsRoutes;
