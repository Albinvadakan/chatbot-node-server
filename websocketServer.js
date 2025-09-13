const WebSocket = require('ws');
const url = require('url');
const AuthService = require('./auth');

class WebSocketServer {
  constructor(server, authService) {
    this.wss = new WebSocket.Server({ 
      server,
      verifyClient: this.verifyClient.bind(this)
    });
    this.authService = authService;
    this.clients = new Map(); // Store authenticated connections
    this.sessions = new Map(); // Store session data
    
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

      // Verify JWT token
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
      
      // Store client connection
      this.clients.set(clientId, {
        ws,
        user,
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      // Initialize session
      this.sessions.set(clientId, {
        userId: user.userId,
        username: user.username,
        messages: [],
        createdAt: new Date()
      });

      // Set up client-specific event handlers
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
      // Update last activity on pong response
      const client = this.clients.get(clientId);
      if (client) {
        client.lastActivity = new Date();
      }
    });

    // Send welcome message
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

    // Update last activity
    client.lastActivity = new Date();
    
    // Store message in session
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
      // Send typing indicator
      this.sendMessage(clientId, {
        type: 'typing',
        message: 'AI is thinking...',
        timestamp: new Date().toISOString()
      });

      // Forward to message handler (will be implemented in the next step)
      const MessageHandler = require('./messageHandler');
      const messageHandler = new MessageHandler();
      
      await messageHandler.handleChatMessage(clientId, message, this);
    } catch (error) {
      console.error('Error handling chat message:', error);
      this.sendError(clientId, 'Failed to process chat message');
    }
  }

  async handleHumanEscalation(clientId, message) {
    const session = this.sessions.get(clientId);
    
    // Store escalation request
    session.messages.push({
      type: 'system',
      message: 'Human escalation requested',
      timestamp: new Date(),
      from: 'system'
    });

    // Send predefined response
    const response = {
      type: 'human-escalation-response',
      message: 'A human agent will contact you soon.',
      timestamp: new Date().toISOString()
    };

    this.sendMessage(clientId, response);
    
    // Store response in session
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
    // Keep session data for potential reconnection (could be cleaned up later)
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

  // Health check and cleanup methods
  startHealthCheck() {
    setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        } else {
          this.cleanupClient(clientId);
        }
      });
    }, 30000); // Check every 30 seconds
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