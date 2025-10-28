const express = require('express');
const ServerController = require('../controllers/serverController');

const createServerRoutes = (wsServer, messageHandler) => {
  const router = express.Router();
  const serverController = new ServerController(wsServer, messageHandler);
  router.get('/health', serverController.healthCheck);
  router.get('/websocket/info', serverController.websocketInfo);
  router.get('/stats', serverController.serverStats);

  return router;
};

module.exports = createServerRoutes;