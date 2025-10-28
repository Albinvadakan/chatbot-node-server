const express = require('express');
const EscalationController = require('../controllers/escalationController');
const { authenticateToken } = require('../middleware');

const createEscalationRoutes = (escalationService) => {
  const router = express.Router();
  const escalationController = new EscalationController(escalationService);

  // All escalation routes require authentication
  router.use(authenticateToken);

  // Submit new escalation request (for human assistance)
  router.post('/escalation/submit', escalationController.submitEscalation);

  // Get all escalation entries (with pagination and filtering)
  router.get('/escalation/all', escalationController.getAllEscalations);

  // Get authenticated user's escalation history
  router.get('/escalation/my-requests', escalationController.getUserEscalations);

  // Update escalation status
  router.put('/escalation/:escalationId/status', escalationController.updateEscalationStatus);

  // Delete escalation
  router.delete('/escalation/:escalationId', escalationController.deleteEscalation);

  // Get escalation statistics
  router.get('/escalation/stats', escalationController.getEscalationStats);

  // Escalation service health check
  router.get('/escalation/health', escalationController.healthCheck);

  return router;
};

module.exports = createEscalationRoutes;
