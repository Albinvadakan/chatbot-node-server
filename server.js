const express = require('express');
const http = require('http');
require('dotenv').config();

const AuthService = require('./auth');
const FeedbackService = require('./feedbackService');
const FileUploadService = require('./services/fileUploadService');
const AnalyticsService = require('./services/analyticsService');
const EscalationService = require('./services/escalationService');
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
    this.fileUploadService = new FileUploadService();
    this.analyticsService = new AnalyticsService(this.authService);
    this.escalationService = new EscalationService(this.authService);
    this.wsServer = null;
    this.messageHandler = null; // Will be initialized after analytics service
    
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

    // Analytics routes - Main feedback and reporting system
    const createAnalyticsRoutes = require('./routes/analyticsRoutes');
    this.app.use('/api', createAnalyticsRoutes(this.analyticsService, this.authService));

    // File upload routes (independent of WebSocket)
    const createFileRoutes = require('./routes/fileRoutes');
    this.app.use('/api', createFileRoutes(this.fileUploadService));

    // Escalation routes (human assistance requests)
    const createEscalationRoutes = require('./routes/escalationRoutes');
    this.app.use('/api', createEscalationRoutes(this.escalationService));

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

      // Initialize analytics service
      console.log('Initializing analytics service...');
      await this.analyticsService.initialize();

      // Initialize escalation service
      console.log('Initializing escalation service...');
      await this.escalationService.initialize();

      // Initialize message handler with analytics service
      this.messageHandler = new MessageHandler(this.analyticsService);

      // Initialize file upload service
      console.log('Initializing file upload service...');
      await this.fileUploadService.connect();

      // Initialize WebSocket server with message handler
      console.log('Setting up WebSocket server...');
      this.wsServer = new WebSocketServer(this.server, this.authService, this.feedbackService, this.messageHandler);
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