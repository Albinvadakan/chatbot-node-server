const { ObjectId } = require('mongodb');

class EscalationService {
  constructor(authService) {
    this.authService = authService;
    this.db = null;
    this.escalations = null;
  }

  // Initialize the escalation service with MongoDB connection
  async initialize() {
    if (!this.authService.db) {
      throw new Error('MongoDB connection not established. Please ensure AuthService is connected.');
    }
    
    this.db = this.authService.db;
    this.escalations = this.db.collection('escalations');
    
    // Create indexes for better performance
    await this.createIndexes();
    console.log('EscalationService initialized successfully');
  }

  // Create MongoDB indexes for better query performance
  async createIndexes() {
    try {
      // Index on userId for fast user-specific queries
      await this.escalations.createIndex({ userId: 1 });
      
      // Index on createdAt for sorting
      await this.escalations.createIndex({ createdAt: -1 });
      
      // Index on priority level for filtering
      await this.escalations.createIndex({ priorityLevel: 1 });
      
      // Index on status for filtering resolved/unresolved escalations
      await this.escalations.createIndex({ status: 1 });
      
      console.log('Escalation collection indexes created successfully');
    } catch (error) {
      console.error('Error creating escalation indexes:', error);
    }
  }

  // Store a new escalation request
  async createEscalation(userId, reason, contactNumber, priorityLevel) {
    try {
      // Validate required fields
      if (!userId || !reason || !contactNumber || !priorityLevel) {
        throw new Error('UserId, reason, contactNumber, and priorityLevel are required');
      }

      // Validate reason length
      if (reason.trim().length === 0) {
        throw new Error('Reason cannot be empty');
      }

      if (reason.length > 1000) {
        throw new Error('Reason cannot exceed 1000 characters');
      }

      // Validate contact number format (basic validation)
      const contactNumberStr = contactNumber.toString().trim();
      if (contactNumberStr.length < 10 || contactNumberStr.length > 15) {
        throw new Error('Contact number must be between 10 and 15 digits');
      }

      // Validate priority level
      const validPriorityLevels = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorityLevels.includes(priorityLevel.toLowerCase())) {
        throw new Error('Priority level must be one of: low, medium, high, urgent');
      }

      const escalationData = {
        userId: new ObjectId(userId),
        reason: reason.trim(),
        contactNumber: contactNumberStr,
        priorityLevel: priorityLevel.toLowerCase(),
        status: 'open', // open, in-progress, resolved
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.escalations.insertOne(escalationData);

      return {
        success: true,
        escalationId: result.insertedId,
        message: 'Escalation request submitted successfully'
      };
    } catch (error) {
      console.error('Error storing escalation:', error);
      throw error;
    }
  }

  // Get all escalation entries with pagination and filtering
  async getAllEscalations(page = 1, limit = 20, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const query = {};

      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.priorityLevel) {
        query.priorityLevel = filters.priorityLevel;
      }

      if (filters.userId) {
        query.userId = new ObjectId(filters.userId);
      }

      // Date range filter
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        }
      }

      // Get total count for pagination
      const totalCount = await this.escalations.countDocuments(query);

      // Fetch escalations with user details
      const escalations = await this.escalations.aggregate([
        { $match: query },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userDetails'
          }
        },
        {
          $unwind: {
            path: '$userDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            reason: 1,
            contactNumber: 1,
            priorityLevel: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            'userDetails.username': 1,
            'userDetails.email': 1
          }
        }
      ]).toArray();

      return {
        success: true,
        escalations,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          limit
        }
      };
    } catch (error) {
      console.error('Error fetching escalations:', error);
      throw error;
    }
  }

  // Get escalations for a specific user
  async getUserEscalations(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const query = { userId: new ObjectId(userId) };

      const totalCount = await this.escalations.countDocuments(query);

      const escalations = await this.escalations.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return {
        success: true,
        escalations,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          limit
        }
      };
    } catch (error) {
      console.error('Error fetching user escalations:', error);
      throw error;
    }
  }

  // Update escalation status
  async updateEscalationStatus(escalationId, status, userId = null) {
    try {
      const validStatuses = ['open', 'in-progress', 'resolved'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status. Must be one of: open, in-progress, resolved');
      }

      const query = { _id: new ObjectId(escalationId) };
      if (userId) {
        query.userId = new ObjectId(userId);
      }

      const result = await this.escalations.updateOne(
        query,
        {
          $set: {
            status,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        throw new Error('Escalation not found or unauthorized');
      }

      return {
        success: true,
        message: 'Escalation status updated successfully'
      };
    } catch (error) {
      console.error('Error updating escalation status:', error);
      throw error;
    }
  }

  // Delete escalation
  async deleteEscalation(escalationId, userId = null) {
    try {
      const query = { _id: new ObjectId(escalationId) };
      if (userId) {
        query.userId = new ObjectId(userId);
      }

      const result = await this.escalations.deleteOne(query);

      if (result.deletedCount === 0) {
        throw new Error('Escalation not found or unauthorized');
      }

      return {
        success: true,
        message: 'Escalation deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting escalation:', error);
      throw error;
    }
  }

  // Get escalation statistics
  async getEscalationStats() {
    try {
      const stats = await this.escalations.aggregate([
        {
          $facet: {
            byStatus: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 }
                }
              }
            ],
            byPriority: [
              {
                $group: {
                  _id: '$priorityLevel',
                  count: { $sum: 1 }
                }
              }
            ],
            total: [
              {
                $count: 'count'
              }
            ]
          }
        }
      ]).toArray();

      return {
        success: true,
        stats: stats[0]
      };
    } catch (error) {
      console.error('Error fetching escalation stats:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.db) {
        throw new Error('Database connection not established');
      }

      // Test database connectivity
      await this.db.admin().ping();

      return {
        status: 'healthy',
        message: 'Escalation service is operational',
        database: 'connected'
      };
    } catch (error) {
      console.error('Escalation service health check failed:', error);
      return {
        status: 'unhealthy',
        message: error.message,
        database: 'disconnected'
      };
    }
  }
}

module.exports = EscalationService;
