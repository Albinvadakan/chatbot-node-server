const express = require('express');
const EscalationController = require('../controllers/escalationController');
const { authenticateToken } = require('../middleware');

const createEscalationRoutes = (escalationService) => {
  const router = express.Router();
  const escalationController = new EscalationController(escalationService);
  router.use(authenticateToken);
  router.post('/escalation/submit', escalationController.submitEscalation);
  router.get('/escalation/all', escalationController.getAllEscalations);
  router.get('/escalation/my-requests', escalationController.getUserEscalations);
  router.put('/escalation/:escalationId/status', escalationController.updateEscalationStatus);
  router.delete('/escalation/:escalationId', escalationController.deleteEscalation);
  router.get('/escalation/stats', escalationController.getEscalationStats);
  router.get('/escalation/health', escalationController.healthCheck);
  return router;
};

module.exports = createEscalationRoutes;
