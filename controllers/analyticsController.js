class AnalyticsController {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
  }

  /**
   * Update feedback for a message (thumbs up/down)
   * POST /api/analytics/feedback
   * Body: { messageId: string, feedbackType: 'positive' | 'negative' }
   */
  updateFeedback = async (req, res) => {
    try {
      const { messageId, feedbackType } = req.body;

      // Validate input
      if (!messageId) {
        return res.status(400).json({
          success: false,
          error: 'messageId is required'
        });
      }

      if (!feedbackType || (feedbackType !== 'positive' && feedbackType !== 'negative')) {
        return res.status(400).json({
          success: false,
          error: 'feedbackType must be either "positive" or "negative"'
        });
      }

      // Update feedback
      const result = await this.analyticsService.updateFeedback(messageId, feedbackType);

      res.status(200).json(result);

    } catch (error) {
      console.error('Error in updateFeedback controller:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update feedback'
      });
    }
  };

  /**
   * Get analytics summary for a specific user
   * GET /api/analytics/user/:userId
   */
  getUserSummary = async (req, res) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required'
        });
      }

      const result = await this.analyticsService.getUserSummary(userId);

      res.status(200).json(result);

    } catch (error) {
      console.error('Error in getUserSummary controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user analytics summary'
      });
    }
  };

  /**
   * Get analytics summary for all users
   * GET /api/analytics/all-users
   */
  getAllUsersSummary = async (req, res) => {
    try {
      const result = await this.analyticsService.getAllUsersSummary();

      res.status(200).json(result);

    } catch (error) {
      console.error('Error in getAllUsersSummary controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve all users analytics summary'
      });
    }
  };
}

module.exports = AnalyticsController;
