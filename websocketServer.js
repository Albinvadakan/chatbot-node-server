const WebSocket = require('ws');
const url = require('url');
const AuthService = require('./auth');

class WebSocketServer {
  constructor(server, authService, feedbackService = null, messageHandler = null) {
    this.wss = new WebSocket.Server({ 
      server,
      verifyClient: this.verifyClient.bind(this)
    });
    this.authService = authService;
    this.feedbackService = feedbackService;
    this.messageHandler = messageHandler;
    this.clients = new Map();
    this.sessions = new Map();
    
    this.setupEventHandlers();
  }

  verifyClient(info) {
    try {
      const query = url.parse(info.req.url, true).query;
      const token = query.token || info.req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        console.log('WebSocket connection rejected: No token provided');
        return false;
      }

      const decoded = this.authService.verifyToken(token);
      info.req.user = decoded;
      return true;
    } catch (error) {
      console.log('WebSocket connection rejected: Invalid token', error.message);
      return false;
    }
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      const user = req.user;
      const clientId = this.generateClientId();
      console.log(`WebSocket connected: ${user.username} (${clientId})`);
      this.clients.set(clientId, {
        ws,
        user,
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      this.sessions.set(clientId, {
        userId: user.userId,
        username: user.username,
        messages: [],
        createdAt: new Date()
      });

      this.setupClientHandlers(ws, clientId);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket Server Error:', error);
    });
  }

  setupClientHandlers(ws, clientId) {
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(clientId, message);
      } catch (error) {
        console.error('Error handling message:', error);
        this.sendError(clientId, 'Invalid message format');
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`WebSocket disconnected: ${clientId} (Code: ${code})`);
      this.cleanupClient(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket client error (${clientId}):`, error);
      this.cleanupClient(clientId);
    });

    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastActivity = new Date();
      }
    });

    this.sendMessage(clientId, {
      type: 'connection',
      message: 'Connected to chatbot server',
      timestamp: new Date().toISOString()
    });
  }

  async handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    const session = this.sessions.get(clientId);
    
    if (!client || !session) {
      console.error('Client or session not found:', clientId);
      return;
    }

    client.lastActivity = new Date();

    session.messages.push({
      ...message,
      timestamp: new Date(),
      from: 'user'
    });

    console.log(`Message from ${session.username}: ${message.type}`);

    switch (message.type) {
      case 'chat':
        await this.handleChatMessage(clientId, message);
        break;
      
      case 'feedback':
        await this.handleFeedbackMessage(clientId, message);
        break;
      
      case 'human-escalation':
        await this.handleHumanEscalation(clientId, message);
        break;
      
      case 'ping':
        this.sendMessage(clientId, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      
      default:
        this.sendError(clientId, 'Unknown message type');
    }
  }

  async handleChatMessage(clientId, message) {
    try {
      let messageHandler = this.messageHandler;
      if (!messageHandler) {
        const MessageHandler = require('./messageHandler');
        messageHandler = new MessageHandler();
      }
      
      const validation = messageHandler.validateMessage(message);
      if (!validation.valid) {
        this.sendError(clientId, validation.error);
        return;
      }

      this.sendMessage(clientId, {
        type: 'typing',
        message: 'AI is thinking...',
        timestamp: new Date().toISOString()
      });

      await messageHandler.handleChatMessage(clientId, message, this);
      
    } catch (error) {
      console.error('Error handling chat message:', error);
      this.sendError(clientId, 'Failed to process chat message');
    }
  }

  async handleFeedbackMessage(clientId, message) {
    try {
      const session = this.sessions.get(clientId);
      
      if (!session) {
        this.sendError(clientId, 'Session not found');
        return;
      }

      const analyticsService = this.messageHandler?.analyticsService;
      
      if (!analyticsService) {
        console.error('Analytics service not available');
        this.sendError(clientId, 'Analytics service not available');
        return;
      }

      const { messageId, feedbackType } = message;
      
      if (!messageId || !feedbackType) {
        this.sendError(clientId, 'messageId and feedbackType are required');
        return;
      }

      if (!['positive', 'negative'].includes(feedbackType)) {
        this.sendError(clientId, 'feedbackType must be either "positive" or "negative"');
        return;
      }
      const result = await analyticsService.updateFeedback(messageId, feedbackType);
      this.sendMessage(clientId, {
        type: 'feedback-confirmation',
        success: true,
        messageId: messageId,
        feedbackType: feedbackType,
        positiveFeedback: result.positiveFeedback,
        negativeFeedback: result.negativeFeedback,
        message: 'Feedback submitted successfully',
        timestamp: new Date().toISOString()
      });

      console.log(`Feedback submitted by ${session.username}: ${feedbackType} for message ${messageId}`);

    } catch (error) {
      console.error('Error handling feedback message:', error);
      this.sendError(clientId, error.message || 'Failed to submit feedback');
    }
  }

  async handleHumanEscalation(clientId, message) {
    const session = this.sessions.get(clientId);
    
    if (!session) {
      this.sendError(clientId, 'Session not found');
      return;
    }

    session.messages.push({
      type: 'system',
      message: 'Human escalation requested',
      timestamp: new Date(),
      from: 'system'
    });

    const response = {
      type: 'human-escalation-response',
      message: 'A human agent will contact you soon.',
      timestamp: new Date().toISOString()
    };

    this.sendMessage(clientId, response);
    
    session.messages.push({
      ...response,
      from: 'system'
    });

    console.log(`Human escalation requested by ${session.username}`);
  }

  sendMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  sendError(clientId, errorMessage) {
    this.sendMessage(clientId, {
      type: 'error',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }

  broadcastMessage(message) {
    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(clientId, message);
      }
    });
  }

  cleanupClient(clientId) {
    this.clients.delete(clientId);
    console.log(`Cleaned up client: ${clientId}`);
  }

  generateClientId() {
    return 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  getClientCount() {
    return this.clients.size;
  }

  getSessionData(clientId) {
    return this.sessions.get(clientId);
  }

  startHealthCheck() {
    setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        } else {
          this.cleanupClient(clientId);
        }
      });
    }, 30000);
  }

  cleanup() {
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
      }
    });
    this.clients.clear();
    this.sessions.clear();
  }
}

module.exports = WebSocketServer;