const express = require('express');
const http = require('http');
require('dotenv').config();

const AuthService = require('./auth');
const WebSocketServer = require('./websocketServer');
const MessageHandler = require('./messageHandler');

// Import modular components
const { setupMiddleware } = require('./middleware');
const createAuthRoutes = require('./routes/authRoutes');
const createServerRoutes = require('./routes/serverRoutes');
const ServerController = require('./controllers/serverController');
const { setupProcessHandlers } = require('./utils/processHandlers');
const { printServerInfo } = require('./utils/logger');

class ChatbotServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.authService = new AuthService();
    this.wsServer = null;
    this.messageHandler = new MessageHandler();
    
    this.setupApplication();
  }

  setupApplication() {
    // Setup middleware
    setupMiddleware(this.app);
    
    // Setup routes
    this.setupRoutes();
  }

  setupRoutes() {
    // Authentication routes
    this.app.use('/api/auth', createAuthRoutes(this.authService));

    // File upload routes (independent of WebSocket)
    const createFileRoutes = require('./routes/fileRoutes');
    this.app.use('/api', createFileRoutes());

    // Server routes will be setup after WebSocket initialization
    this.setupServerRoutes();

    // Catch-all route for undefined endpoints
    const serverController = new ServerController(this.wsServer, this.messageHandler);
    this.app.use('*', serverController.notFound);
  }

  setupServerRoutes() {
    // Setup server routes (health, stats, websocket info)
    this.app.use('/api', createServerRoutes(this.wsServer, this.messageHandler));
  }

  async start() {
    try {
      // Connect to MongoDB
      console.log('Connecting to MongoDB Atlas...');
      await this.authService.connect();

      // Initialize WebSocket server
      console.log('Setting up WebSocket server...');
      this.wsServer = new WebSocketServer(this.server, this.authService);
      this.wsServer.startHealthCheck();

      // Check FastAPI connectivity
      console.log('Checking FastAPI connectivity...');
      const fastApiHealthy = await this.messageHandler.checkFastAPIHealth();
      if (fastApiHealthy) {
        console.log('✓ FastAPI service is reachable');
      } else {
        console.warn('⚠ FastAPI service is not reachable - chat functionality may be limited');
      }

      // Start the server
      const port = process.env.PORT || 3001;
      this.server.listen(port, () => {
        printServerInfo(port, fastApiHealthy);
      });

      // Graceful shutdown handling
      setupProcessHandlers(this.server, this.wsServer, this.authService);

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the server
if (require.main === module) {
  const server = new ChatbotServer();
  server.start();
}

module.exports = ChatbotServer;