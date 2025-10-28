class FeedbackController {
  constructor(feedbackService) {
    this.feedbackService = feedbackService;
  }

  submitFeedback = async (req, res) => {
    try {
      const user = req.user; 
      const { userQuestion, feedbackType, messageId } = req.body;

      if (!userQuestion || !feedbackType) {
        return res.status(400).json({
          success: false,
          message: 'userQuestion and feedbackType are required'
        });
      }

      if (!['positive', 'negative'].includes(feedbackType)) {
        return res.status(400).json({
          success: false,
          message: 'feedbackType must be either "positive" or "negative"'
        });
      }

      if (userQuestion.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'userQuestion cannot be empty'
        });
      }

      if (userQuestion.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'userQuestion cannot exceed 2000 characters'
        });
      }

      const result = await this.feedbackService.storeFeedback(
        user.userId,
        userQuestion,
        feedbackType,
        messageId
      );

      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        feedbackId: result.feedbackId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Submit feedback error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to submit feedback'
      });
    }
  };

  getUserAnalytics = async (req, res) => {
    try {
      const user = req.user;

      const analytics = await this.feedbackService.getUserAnalytics(user.userId);

      res.json({
        success: true,
        analytics: analytics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get user analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user analytics'
      });
    }
  };

  getUserFeedback = async (req, res) => {
    try {
      const user = req.user;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100); 

      if (page < 1) {
        return res.status(400).json({
          success: false,
          message: 'Page number must be greater than 0'
        });
      }

      const result = await this.feedbackService.getUserFeedback(user.userId, page, limit);

      res.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get user feedback error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user feedback'
      });
    }
  };

  getRecentFeedback = async (req, res) => {
    try {
      const user = req.user;
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);

      const recentFeedback = await this.feedbackService.getRecentUserFeedback(user.userId, limit);

      res.json({
        success: true,
        recentFeedback: recentFeedback,
        count: recentFeedback.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get recent feedback error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get recent feedback'
      });
    }
  };

  updateFeedback = async (req, res) => {
    try {
      const user = req.user;
      const { feedbackId } = req.params;
      const { feedbackType } = req.body;

      if (!feedbackId) {
        return res.status(400).json({
          success: false,
          message: 'Feedback ID is required'
        });
      }

      if (!feedbackType || !['positive', 'negative'].includes(feedbackType)) {
        return res.status(400).json({
          success: false,
          message: 'feedbackType must be either "positive" or "negative"'
        });
      }

      const existingFeedback = await this.feedbackService.feedback.findOne({
        _id: feedbackId,
        userId: user.userId
      });

      if (!existingFeedback) {
        return res.status(404).json({
          success: false,
          message: 'Feedback not found or not authorized'
        });
      }

      const result = await this.feedbackService.updateFeedback(feedbackId, feedbackType);

      res.json({
        success: true,
        message: 'Feedback updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Update feedback error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update feedback'
      });
    }
  };

  deleteFeedback = async (req, res) => {
    try {
      const user = req.user;
      const { feedbackId } = req.params;

      if (!feedbackId) {
        return res.status(400).json({
          success: false,
          message: 'Feedback ID is required'
        });
      }

      const result = await this.feedbackService.deleteFeedback(feedbackId, user.userId);

      res.json({
        success: true,
        message: 'Feedback deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Delete feedback error:', error);
      
      if (error.message.includes('not found') || error.message.includes('not authorized')) {
        return res.status(404).json({
          success: false,
          message: 'Feedback not found or not authorized'
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete feedback'
      });
    }
  };

  getFeedbackByMessageId = async (req, res) => {
    try {
      const user = req.user;
      const { messageId } = req.params;

      if (!messageId) {
        return res.status(400).json({
          success: false,
          message: 'Message ID is required'
        });
      }

      const feedback = await this.feedbackService.getFeedbackByMessageId(messageId, user.userId);

      if (!feedback) {
        return res.status(404).json({
          success: false,
          message: 'No feedback found for this message'
        });
      }

      res.json({
        success: true,
        feedback: feedback,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get feedback by messageId error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get feedback by message ID'
      });
    }
  };

  healthCheck = async (req, res) => {
    try {
      const isHealthy = this.feedbackService && this.feedbackService.db;

      if (isHealthy) {
        res.json({
          success: true,
          status: 'healthy',
          service: 'feedback',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          success: false,
          status: 'unhealthy',
          service: 'feedback',
          message: 'Feedback service not properly initialized',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Feedback health check error:', error);
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        service: 'feedback',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  getSystemAnalytics = async (req, res) => {
    try {
      const systemAnalytics = await this.feedbackService.getSystemAnalytics();

      res.json({
        success: true,
        systemAnalytics: systemAnalytics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get system analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get system analytics'
      });
    }
  };
}

module.exports = FeedbackController;