const express = require('express');
const http = require('http');
require('dotenv').config();

const AuthService = require('./auth');
const FeedbackService = require('./feedbackService');
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
    this.feedbackService = new FeedbackService(this.authService);
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
    // Authentication routes (with optional feedback service for analytics)
    this.app.use('/api/auth', createAuthRoutes(this.authService, this.feedbackService));

    // Feedback routes
    const createFeedbackRoutes = require('./routes/feedbackRoutes');
    this.app.use('/api', createFeedbackRoutes(this.feedbackService));

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

      // Initialize feedback service
      console.log('Initializing feedback service...');
      await this.feedbackService.initialize();

      // Initialize WebSocket server
      console.log('Setting up WebSocket server...');
      this.wsServer = new WebSocketServer(this.server, this.authService, this.feedbackService);
      this.wsServer.startHealthCheck();

      // Check Python AI API connectivity
      console.log('Checking Python AI API connectivity...');
      const pythonApiHealthy = await this.messageHandler.checkPythonAPIHealth();
      if (pythonApiHealthy) {
        console.log('✓ Python AI API service is reachable');
      } else {
        console.warn('⚠ Python AI API service is not reachable - chat functionality may be limited');
      }

      // Start the server
      const port = process.env.PORT || 3001;
      this.server.listen(port, () => {
        printServerInfo(port, pythonApiHealthy);
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