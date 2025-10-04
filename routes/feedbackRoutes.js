const express = require('express');
const FeedbackController = require('../controllers/feedbackController');
const { authenticateToken } = require('../middleware');

const createFeedbackRoutes = (feedbackService) => {
  const router = express.Router();
  const feedbackController = new FeedbackController(feedbackService);

  // All feedback routes require authentication
  router.use(authenticateToken);

  // Submit new feedback
  router.post('/feedback/submit', feedbackController.submitFeedback);

  // Get user's feedback analytics (dashboard data)
  router.get('/feedback/analytics', feedbackController.getUserAnalytics);

  // Get user's feedback history with pagination
  router.get('/feedback/history', feedbackController.getUserFeedback);

  // Get recent feedback for user (for quick overview)
  router.get('/feedback/recent', feedbackController.getRecentFeedback);

  // Update existing feedback
  router.put('/feedback/:feedbackId', feedbackController.updateFeedback);

  // Delete feedback
  router.delete('/feedback/:feedbackId', feedbackController.deleteFeedback);

  // Get feedback by message ID
  router.get('/feedback/message/:messageId', feedbackController.getFeedbackByMessageId);

  // Feedback service health check
  router.get('/feedback/health', feedbackController.healthCheck);

  // System analytics (optional - for admin use)
  router.get('/feedback/system-analytics', feedbackController.getSystemAnalytics);

  return router;
};

module.exports = createFeedbackRoutes;