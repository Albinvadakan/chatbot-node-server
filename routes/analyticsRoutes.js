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

  // Authentication middleware (optional - can be applied selectively)
  const authenticateTokenOptional = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided - skip authentication
      return next();
    }

    try {
      const decoded = authService.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      // Invalid token but don't fail - just skip authentication
      return next();
    }
  };

  // Authentication middleware (required)
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

  // Public endpoint - Update feedback (no auth required as client provides messageId)
  router.post('/analytics/feedback', controller.updateFeedback);

  // Get analytics summary for a specific user (no auth required - pass userId in URL)
  router.get('/analytics/user/:userId', controller.getUserSummary);

  // Get analytics summary for all users (no auth required)
  router.get('/analytics/all-users', controller.getAllUsersSummary);

  return router;
}

module.exports = createAnalyticsRoutes;
