const axios = require('axios');

class MessageHandler {
  constructor(analyticsService = null) {
    this.fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    this.analyticsService = analyticsService;
  }

  async handleChatMessage(clientId, message, wsServer) {
    try {
      const session = wsServer.getSessionData(clientId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Extract query from message
      const query = message.content || message.message || message.query;
      
      if (!query || query.trim().length === 0) {
        wsServer.sendError(clientId, 'Message content is required');
        return;
      }

      // Validate query length (1-2000 characters as per API spec)
      if (query.length > 2000) {
        wsServer.sendError(clientId, 'Message too long. Maximum 2000 characters allowed.');
        return;
      }

      // Prepare request to your FastAPI endpoint
      const requestData = {
        query: query.trim(),
        patientId: session.userId,
        patientName: session.username
      };

      console.log(`Forwarding chat message to Python AI API from patient ${session.username} (${session.userId}): ${query}`);

      // Generate message ID before storing
      const messageId = this.generateMessageId();

      // Store user message in session
      session.messages.push({
        type: 'chat',
        message: query,
        timestamp: new Date(),
        from: 'user',
        messageId: messageId
      });

      // Store question in analytics if service is available
      if (this.analyticsService) {
        try {
          await this.analyticsService.storeQuestion(
            session.userId,
            session.username,
            query,
            messageId
          );
        } catch (error) {
          console.error('Error storing question in analytics:', error);
          // Don't fail the request if analytics fails
        }
      }

      // Make request to your Python FastAPI
      await this.callPythonAIAPI(clientId, requestData, wsServer, session, messageId);

    } catch (error) {
      console.error('Error in handleChatMessage:', error);
      wsServer.sendError(clientId, 'Failed to get AI response');
    }
  }

  async callPythonAIAPI(clientId, requestData, wsServer, session, messageId) {
    try {
      console.log('Calling Python AI API with:', requestData);


      
      const response = await axios({
        method: 'POST',
        url: `${this.fastApiUrl}/api/v1/chat/ai-response`,
        data: requestData,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      });

      // Validate response structure
      if (!response.data || typeof response.data.response !== 'string') {
        throw new Error('Invalid response format from AI API');
      }

      const aiResponse = response.data;
      
      // Send AI response back to client
      const responseMessage = {
        type: 'ai-response',
        messageId: messageId,
        message: aiResponse.response,
        timestamp: aiResponse.timestamp || new Date().toISOString(),
        patient_context: aiResponse.patient_context || []
      };

      wsServer.sendMessage(clientId, responseMessage);

      // Update analytics with AI response if service is available
      if (this.analyticsService) {
        try {
          await this.analyticsService.updateAIResponse(messageId, aiResponse.response);
        } catch (error) {
          console.error('Error updating AI response in analytics:', error);
          // Don't fail the request if analytics fails
        }
      }

      // Store AI response in session
      session.messages.push({
        type: 'ai-response',
        message: aiResponse.response,
        timestamp: new Date(),
        from: 'assistant',
        messageId: messageId,
        patient_context: aiResponse.patient_context
      });

      console.log(`AI response sent to client ${clientId}: ${aiResponse.response.substring(0, 100)}...`);

    } catch (error) {
      console.error('Python AI API request error:', error);
      
      // Handle specific error types
      if (error.code === 'ECONNREFUSED') {
        wsServer.sendError(clientId, 'AI service is currently unavailable. Please try again later.');
      } else if (error.code === 'TIMEOUT' || error.code === 'ENOTFOUND') {
        wsServer.sendError(clientId, 'Request timeout - please try again');
      } else if (error.response) {
        // API returned an error response
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.detail || error.response.data?.message || 'AI service error';
        
        console.error(`AI API Error ${statusCode}:`, errorMessage);
        wsServer.sendError(clientId, `AI service error: ${errorMessage}`);
      } else {
        wsServer.sendError(clientId, 'Failed to connect to AI service');
      }
    }
  }

  generateMessageId() {
    return 'msg_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Health check for Python FastAPI service
  async checkPythonAPIHealth() {
    try {
      const response = await axios.get(`${this.fastApiUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('Python AI API health check failed:', error.message);
      return false;
    }
  }

  // Validate message format
  validateMessage(message) {
    if (!message) {
      return { valid: false, error: 'Message is required' };
    }

    const query = message.content || message.message || message.query;
    
    if (!query || typeof query !== 'string') {
      return { valid: false, error: 'Message content must be a string' };
    }

    if (query.trim().length === 0) {
      return { valid: false, error: 'Message content cannot be empty' };
    }

    if (query.length > 2000) {
      return { valid: false, error: 'Message content cannot exceed 2000 characters' };
    }

    return { valid: true, query: query.trim() };
  }

  // Format error response for consistent error handling
  formatErrorResponse(error, defaultMessage = 'An error occurred') {
    if (error.response) {
      return {
        type: 'error',
        message: error.response.data?.detail || error.response.data?.message || defaultMessage,
        statusCode: error.response.status,
        timestamp: new Date().toISOString()
      };
    } else if (error.code === 'ECONNREFUSED') {
      return {
        type: 'error',
        message: 'AI service is currently unavailable',
        code: 'SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString()
      };
    } else if (error.code === 'TIMEOUT') {
      return {
        type: 'error',
        message: 'Request timeout - please try again',
        code: 'TIMEOUT',
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        type: 'error',
        message: defaultMessage,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = MessageHandler;