const express = require('express');
const FeedbackController = require('../controllers/feedbackController');
const { authenticateToken } = require('../middleware');

const createFeedbackRoutes = (feedbackService) => {
  const router = express.Router();
  const feedbackController = new FeedbackController(feedbackService);
  router.use(authenticateToken);
  router.post('/feedback/submit', feedbackController.submitFeedback);
  router.get('/feedback/analytics', feedbackController.getUserAnalytics);
  router.get('/feedback/history', feedbackController.getUserFeedback);
  router.get('/feedback/recent', feedbackController.getRecentFeedback);
  router.put('/feedback/:feedbackId', feedbackController.updateFeedback);
  router.delete('/feedback/:feedbackId', feedbackController.deleteFeedback);
  router.get('/feedback/message/:messageId', feedbackController.getFeedbackByMessageId);
  router.get('/feedback/health', feedbackController.healthCheck);
  router.get('/feedback/system-analytics', feedbackController.getSystemAnalytics);
  return router;
};

module.exports = createFeedbackRoutes;