class EscalationController {
  constructor(escalationService) {
    this.escalationService = escalationService;
  }

  // Submit a new escalation request
  submitEscalation = async (req, res) => {
    try {
      const user = req.user; // From JWT middleware
      const { reason, contactNumber, priorityLevel } = req.body;

      // Validate required fields
      if (!reason || !contactNumber || !priorityLevel) {
        return res.status(400).json({
          success: false,
          message: 'Reason, contactNumber, and priorityLevel are required'
        });
      }

      // Validate reason
      if (reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Reason cannot be empty'
        });
      }

      if (reason.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Reason cannot exceed 1000 characters'
        });
      }

      // Validate contact number
      const contactNumberStr = contactNumber.toString().trim();
      if (contactNumberStr.length < 10 || contactNumberStr.length > 15) {
        return res.status(400).json({
          success: false,
          message: 'Contact number must be between 10 and 15 digits'
        });
      }

      // Validate priority level
      const validPriorityLevels = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorityLevels.includes(priorityLevel.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Priority level must be one of: low, medium, high, urgent'
        });
      }

      // Submit the escalation
      const result = await this.escalationService.createEscalation(
        user.userId,
        reason,
        contactNumber,
        priorityLevel
      );

      return res.status(201).json(result);
    } catch (error) {
      console.error('Error submitting escalation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit escalation request',
        error: error.message
      });
    }
  };

  // Get all escalation entries (with pagination and filtering)
  getAllEscalations = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      // Build filters from query parameters
      const filters = {};
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.priorityLevel) {
        filters.priorityLevel = req.query.priorityLevel;
      }
      if (req.query.userId) {
        filters.userId = req.query.userId;
      }
      if (req.query.startDate) {
        filters.startDate = req.query.startDate;
      }
      if (req.query.endDate) {
        filters.endDate = req.query.endDate;
      }

      const result = await this.escalationService.getAllEscalations(page, limit, filters);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching escalations:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch escalations',
        error: error.message
      });
    }
  };

  // Get escalations for the authenticated user
  getUserEscalations = async (req, res) => {
    try {
      const user = req.user; // From JWT middleware
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await this.escalationService.getUserEscalations(user.userId, page, limit);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching user escalations:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch your escalations',
        error: error.message
      });
    }
  };

  // Update escalation status
  updateEscalationStatus = async (req, res) => {
    try {
      const { escalationId } = req.params;
      const { status } = req.body;
      const user = req.user; // From JWT middleware

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const validStatuses = ['open', 'in-progress', 'resolved'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: open, in-progress, resolved'
        });
      }

      // Allow users to update only their own escalations
      const result = await this.escalationService.updateEscalationStatus(
        escalationId,
        status,
        user.userId
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error updating escalation status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update escalation status',
        error: error.message
      });
    }
  };

  // Delete escalation
  deleteEscalation = async (req, res) => {
    try {
      const { escalationId } = req.params;
      const user = req.user; // From JWT middleware

      // Allow users to delete only their own escalations
      const result = await this.escalationService.deleteEscalation(
        escalationId,
        user.userId
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error deleting escalation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete escalation',
        error: error.message
      });
    }
  };

  // Get escalation statistics
  getEscalationStats = async (req, res) => {
    try {
      const result = await this.escalationService.getEscalationStats();

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching escalation stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch escalation statistics',
        error: error.message
      });
    }
  };

  // Health check
  healthCheck = async (req, res) => {
    try {
      const health = await this.escalationService.healthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      return res.status(statusCode).json(health);
    } catch (error) {
      console.error('Escalation service health check failed:', error);
      return res.status(503).json({
        status: 'unhealthy',
        message: 'Health check failed',
        error: error.message
      });
    }
  };
}

module.exports = EscalationController;
