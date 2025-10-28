const { ObjectId } = require('mongodb');

class FeedbackService {
  constructor(authService) {
    this.authService = authService;
    this.db = null;
    this.feedback = null;
  }

  async initialize() {
    if (!this.authService.db) {
      throw new Error('MongoDB connection not established. Please ensure AuthService is connected.');
    }
    
    this.db = this.authService.db;
    this.feedback = this.db.collection('feedback');
    
    await this.createIndexes();
    console.log('FeedbackService initialized successfully');
  }

  async createIndexes() {
    try {
      await this.feedback.createIndex({ userId: 1 });

      await this.feedback.createIndex({ userId: 1, createdAt: -1 });

      await this.feedback.createIndex({ feedbackType: 1 });
      
      console.log('Feedback collection indexes created successfully');
    } catch (error) {
      console.error('Error creating feedback indexes:', error);
    }
  }

  async storeFeedback(userId, userQuestion, feedbackType, messageId = null) {
    try {
      if (!userId || !userQuestion || !feedbackType) {
        throw new Error('UserId, userQuestion, and feedbackType are required');
      }

      if (!['positive', 'negative'].includes(feedbackType)) {
        throw new Error('FeedbackType must be either "positive" or "negative"');
      }

      const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;

      const feedbackDoc = {
        userId: userObjectId,
        userQuestion: userQuestion.trim(),
        feedbackType: feedbackType,
        messageId: messageId || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.feedback.insertOne(feedbackDoc);
      
      console.log(`Feedback stored: ${feedbackType} from user ${userId}`);
      return {
        success: true,
        feedbackId: result.insertedId,
        message: 'Feedback stored successfully'
      };

    } catch (error) {
      console.error('Error storing feedback:', error);
      throw error;
    }
  }

  async getUserAnalytics(userId) {
    try {
      const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;

      const pipeline = [
        {
          $match: { userId: userObjectId }
        },
        {
          $group: {
            _id: '$feedbackType',
            count: { $sum: 1 },
            questions: { 
              $push: {
                question: '$userQuestion',
                createdAt: '$createdAt',
                messageId: '$messageId'
              }
            }
          }
        }
      ];

      const results = await this.feedback.aggregate(pipeline).toArray();

      let analytics = {
        totalQuestions: 0,
        positiveCount: 0,
        negativeCount: 0,
        positivePercentage: 0,
        negativePercentage: 0,
        recentFeedback: []
      };

      results.forEach(result => {
        if (result._id === 'positive') {
          analytics.positiveCount = result.count;
        } else if (result._id === 'negative') {
          analytics.negativeCount = result.count;
        }
      });

      analytics.totalQuestions = analytics.positiveCount + analytics.negativeCount;

      if (analytics.totalQuestions > 0) {
        analytics.positivePercentage = Math.round((analytics.positiveCount / analytics.totalQuestions) * 100);
        analytics.negativePercentage = Math.round((analytics.negativeCount / analytics.totalQuestions) * 100);
      }

      analytics.recentFeedback = await this.getRecentUserFeedback(userId, 10);

      return analytics;

    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw error;
    }
  }

  async getRecentUserFeedback(userId, limit = 10) {
    try {
      const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;

      const recentFeedback = await this.feedback
        .find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .project({
          userQuestion: 1,
          feedbackType: 1,
          createdAt: 1,
          messageId: 1
        })
        .toArray();

      return recentFeedback;

    } catch (error) {
      console.error('Error getting recent user feedback:', error);
      throw error;
    }
  }

  async getUserFeedback(userId, page = 1, limit = 20) {
    try {
      const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
      const skip = (page - 1) * limit;

      const feedbackList = await this.feedback
        .find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const totalCount = await this.feedback.countDocuments({ userId: userObjectId });

      return {
        feedback: feedbackList,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount: totalCount,
          hasNext: skip + limit < totalCount,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      console.error('Error getting user feedback:', error);
      throw error;
    }
  }

  async updateFeedback(feedbackId, newFeedbackType) {
    try {
      if (!['positive', 'negative'].includes(newFeedbackType)) {
        throw new Error('FeedbackType must be either "positive" or "negative"');
      }

      const feedbackObjectId = typeof feedbackId === 'string' ? new ObjectId(feedbackId) : feedbackId;

      const result = await this.feedback.updateOne(
        { _id: feedbackObjectId },
        { 
          $set: { 
            feedbackType: newFeedbackType,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        throw new Error('Feedback not found');
      }

      return {
        success: true,
        message: 'Feedback updated successfully'
      };

    } catch (error) {
      console.error('Error updating feedback:', error);
      throw error;
    }
  }

  async deleteFeedback(feedbackId, userId) {
    try {
      const feedbackObjectId = typeof feedbackId === 'string' ? new ObjectId(feedbackId) : feedbackId;
      const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;

      const result = await this.feedback.deleteOne({ 
        _id: feedbackObjectId,
        userId: userObjectId
      });

      if (result.deletedCount === 0) {
        throw new Error('Feedback not found or not authorized');
      }

      return {
        success: true,
        message: 'Feedback deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw error;
    }
  }

  async getFeedbackByMessageId(messageId, userId) {
    try {
      const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;

      const feedback = await this.feedback.findOne({
        messageId: messageId,
        userId: userObjectId
      });

      return feedback;

    } catch (error) {
      console.error('Error getting feedback by messageId:', error);
      throw error;
    }
  }

  async getSystemAnalytics() {
    try {
      const pipeline = [
        {
          $group: {
            _id: '$feedbackType',
            count: { $sum: 1 }
          }
        }
      ];

      const results = await this.feedback.aggregate(pipeline).toArray();
      
      let systemAnalytics = {
        totalFeedback: 0,
        positiveCount: 0,
        negativeCount: 0,
        positivePercentage: 0,
        negativePercentage: 0
      };

      results.forEach(result => {
        if (result._id === 'positive') {
          systemAnalytics.positiveCount = result.count;
        } else if (result._id === 'negative') {
          systemAnalytics.negativeCount = result.count;
        }
      });

      systemAnalytics.totalFeedback = systemAnalytics.positiveCount + systemAnalytics.negativeCount;

      if (systemAnalytics.totalFeedback > 0) {
        systemAnalytics.positivePercentage = Math.round((systemAnalytics.positiveCount / systemAnalytics.totalFeedback) * 100);
        systemAnalytics.negativePercentage = Math.round((systemAnalytics.negativeCount / systemAnalytics.totalFeedback) * 100);
      }

      return systemAnalytics;

    } catch (error) {
      console.error('Error getting system analytics:', error);
      throw error;
    }
  }
}

module.exports = FeedbackService;