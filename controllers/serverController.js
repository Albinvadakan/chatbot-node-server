class ServerController {
  constructor(wsServer, messageHandler) {
    this.wsServer = wsServer;
    this.messageHandler = messageHandler;
  }

  healthCheck = (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: require('../package.json').version
    });
  };

  websocketInfo = (req, res) => {
    res.json({
      endpoint: '/ws',
      authentication: 'JWT token required as query parameter or Authorization header',
      example: 'ws://localhost:3001/ws?token=your-jwt-token',
      connectedClients: this.wsServer ? this.wsServer.getClientCount() : 0
    });
  };

  serverStats = (req, res) => {
    res.json({
      connectedClients: this.wsServer ? this.wsServer.getClientCount() : 0,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  };

  notFound = (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Endpoint not found'
    });
  };
}

module.exports = ServerController;