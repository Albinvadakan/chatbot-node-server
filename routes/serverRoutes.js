const express = require('express');
const ServerController = require('../controllers/serverController');

const createServerRoutes = (wsServer, messageHandler) => {
  const router = express.Router();
  const serverController = new ServerController(wsServer, messageHandler);

  // Health check endpoint
  router.get('/health', serverController.healthCheck);

  // WebSocket connection info
  router.get('/websocket/info', serverController.websocketInfo);

  // Server statistics
  router.get('/stats', serverController.serverStats);

  return router;
};

module.exports = createServerRoutes;