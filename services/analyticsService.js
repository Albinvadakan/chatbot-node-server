const { ObjectId } = require('mongodb');

class AnalyticsService {
  constructor(authService) {
    this.authService = authService;
    this.db = null;
    this.analytics = null;
  }

  async initialize() {
    try {
      if (!this.authService.db) {
        throw new Error('MongoDB connection not established. Please ensure AuthService is connected.');
      }

      this.db = this.authService.db;
      this.analytics = this.db.collection('chat_analytics');

      await this.createIndexes();

      console.log('Analytics service initialized successfully');
    } catch (error) {
      console.error('Error initializing analytics service:', error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      await this.analytics.createIndex({ userId: 1, createdAt: -1 });
      await this.analytics.createIndex({ messageId: 1 }, { unique: true });
      await this.analytics.createIndex({ createdAt: -1 });
      await this.analytics.createIndex({ positiveFeedback: 1 });
      await this.analytics.createIndex({ negativeFeedback: 1 });
      console.log('Analytics indexes created successfully');
    } catch (error) {
      console.error('Error creating analytics indexes:', error);
    }
  }

  /**
   * Store a new chat question when user sends a message
   * @param {string} userId - User ID
   * @param {string} username - Username
   * @param {string} question - User's question
   * @param {string} messageId - Unique message ID
   * @param {string} aiResponse - AI's response (optional, can be added later)
   * @returns {Object} Created analytics record
   */
  async storeQuestion(userId, username, question, messageId, aiResponse = null) {
    try {
      if (!userId || !question || !messageId) {
        throw new Error('userId, question, and messageId are required');
      }

      const analyticsRecord = {
        userId: userId,
        username: username,
        messageId: messageId,
        question: question,
        aiResponse: aiResponse,
        positiveFeedback: false,
        negativeFeedback: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.analytics.insertOne(analyticsRecord);
      
      console.log(`Analytics record created for user ${username} (${userId}), messageId: ${messageId}`);
      
      return {
        success: true,
        recordId: result.insertedId,
        messageId: messageId
      };
    } catch (error) {
      console.error('Error storing question in analytics:', error);
      throw error;
    }
  }

  /**
   * Update the AI response for an existing analytics record
   * @param {string} messageId - Message ID
   * @param {string} aiResponse - AI's response
   * @returns {Object} Update result
   */
  async updateAIResponse(messageId, aiResponse) {
    try {
      if (!messageId || !aiResponse) {
        throw new Error('messageId and aiResponse are required');
      }

      const result = await this.analytics.updateOne(
        { messageId: messageId },
        { 
          $set: { 
            aiResponse: aiResponse,
            updatedAt: new Date()
          } 
        }
      );

      if (result.matchedCount === 0) {
        throw new Error('Analytics record not found for messageId: ' + messageId);
      }

      console.log(`AI response updated for messageId: ${messageId}`);
      
      return {
        success: true,
        messageId: messageId
      };
    } catch (error) {
      console.error('Error updating AI response in analytics:', error);
      throw error;
    }
  }

  /**
   * Update feedback when user clicks thumbs up or thumbs down
   * @param {string} messageId - Message ID
   * @param {string} feedbackType - 'positive' or 'negative'
   * @returns {Object} Update result
   */
  async updateFeedback(messageId, feedbackType) {
    try {
      if (!messageId || !feedbackType) {
        throw new Error('messageId and feedbackType are required');
      }

      if (feedbackType !== 'positive' && feedbackType !== 'negative') {
        throw new Error('feedbackType must be either "positive" or "negative"');
      }

      const existingRecord = await this.analytics.findOne({ messageId: messageId });
      
      if (!existingRecord) {
        throw new Error('Analytics record not found for messageId: ' + messageId);
      }

      const updateFields = {
        updatedAt: new Date()
      };

      if (feedbackType === 'positive') {
        updateFields.positiveFeedback = true;
        updateFields.negativeFeedback = false;
      } else {
        updateFields.positiveFeedback = false;
        updateFields.negativeFeedback = true;
      }

      const result = await this.analytics.updateOne(
        { messageId: messageId },
        { $set: updateFields }
      );

      console.log(`Feedback updated for messageId ${messageId}: ${feedbackType}`);
      
      return {
        success: true,
        messageId: messageId,
        feedbackType: feedbackType,
        positiveFeedback: updateFields.positiveFeedback,
        negativeFeedback: updateFields.negativeFeedback
      };
    } catch (error) {
      console.error('Error updating feedback in analytics:', error);
      throw error;
    }
  }

  /**
   * Get analytics summary for a specific user
   * @param {string} userId - User ID
   * @returns {Object} User's analytics summary (question count, positive count, negative count)
   */
  async getUserSummary(userId) {
    try {
      if (!userId) {
        throw new Error('userId is required');
      }

      const stats = await this.analytics.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: null,
            totalQuestions: { $sum: 1 },
            positiveCount: { $sum: { $cond: ['$positiveFeedback', 1, 0] } },
            negativeCount: { $sum: { $cond: ['$negativeFeedback', 1, 0] } }
          }
        }
      ]).toArray();

      const result = stats.length > 0 ? stats[0] : {
        totalQuestions: 0,
        positiveCount: 0,
        negativeCount: 0
      };

      const firstRecord = await this.analytics.findOne({ userId: userId });
      const username = firstRecord ? firstRecord.username : null;

      return {
        success: true,
        userId: userId,
        username: username,
        totalQuestions: result.totalQuestions,
        positiveResponses: result.positiveCount,
        negativeResponses: result.negativeCount
      };
    } catch (error) {
      console.error('Error getting user summary:', error);
      throw error;
    }
  }

  /**
   * Get analytics summary for all users
   * @returns {Array} Array of user analytics summaries
   */
  async getAllUsersSummary() {
    try {
      const stats = await this.analytics.aggregate([
        {
          $group: {
            _id: '$userId',
            username: { $first: '$username' },
            totalQuestions: { $sum: 1 },
            positiveCount: { $sum: { $cond: ['$positiveFeedback', 1, 0] } },
            negativeCount: { $sum: { $cond: ['$negativeFeedback', 1, 0] } }
          }
        },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            username: 1,
            totalQuestions: 1,
            positiveResponses: '$positiveCount',
            negativeResponses: '$negativeCount'
          }
        },
        { $sort: { totalQuestions: -1 } }
      ]).toArray();

      return {
        success: true,
        totalUsers: stats.length,
        users: stats
      };
    } catch (error) {
      console.error('Error getting all users summary:', error);
      throw error;
    }
  }
}

module.exports = AnalyticsService;
