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
    this.messageHandler = null;
    
    this.setupApplication();
  }

  setupApplication() {
    setupMiddleware(this.app);
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use('/api/auth', createAuthRoutes(this.authService, this.feedbackService));

    const createAnalyticsRoutes = require('./routes/analyticsRoutes');
    this.app.use('/api', createAnalyticsRoutes(this.analyticsService, this.authService));

    const createFileRoutes = require('./routes/fileRoutes');
    this.app.use('/api', createFileRoutes(this.fileUploadService));

    const createEscalationRoutes = require('./routes/escalationRoutes');
    this.app.use('/api', createEscalationRoutes(this.escalationService));

    this.setupServerRoutes();

    const serverController = new ServerController(this.wsServer, this.messageHandler);
    this.app.use('*', serverController.notFound);
  }

  setupServerRoutes() {
    this.app.use('/api', createServerRoutes(this.wsServer, this.messageHandler));
  }

  async start() {
    try {
      console.log('Connecting to MongoDB Atlas...');
      await this.authService.connect();

      console.log('Initializing feedback service...');
      await this.feedbackService.initialize();

      console.log('Initializing analytics service...');
      await this.analyticsService.initialize();

      console.log('Initializing escalation service...');
      await this.escalationService.initialize();

      this.messageHandler = new MessageHandler(this.analyticsService);

      console.log('Initializing file upload service...');
      await this.fileUploadService.connect();

      console.log('Setting up WebSocket server...');
      this.wsServer = new WebSocketServer(this.server, this.authService, this.feedbackService, this.messageHandler);
      this.wsServer.startHealthCheck();

      console.log('Checking Python AI API connectivity...');
      const pythonApiHealthy = await this.messageHandler.checkPythonAPIHealth();
      if (pythonApiHealthy) {
        console.log('✓ Python AI API service is reachable');
      } else {
        console.warn('⚠ Python AI API service is not reachable - chat functionality may be limited');
      }

      const port = process.env.PORT || 3001;
      this.server.listen(port, () => {
        printServerInfo(port, pythonApiHealthy);
      });

      setupProcessHandlers(this.server, this.wsServer, this.authService);

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const server = new ChatbotServer();
  server.start();
}

module.exports = ChatbotServer;