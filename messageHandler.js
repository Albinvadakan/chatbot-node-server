const axios = require('axios');

class MessageHandler {
  constructor() {
    this.fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
  }

  async handleChatMessage(clientId, message, wsServer) {
    try {
      const session = wsServer.getSessionData(clientId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Prepare request to FastAPI
      const requestData = {
        query: message.content || message.message,
        user_id: session.userId,
        session_id: clientId,
        context: this.buildContext(session)
      };

      console.log(`Forwarding chat message to FastAPI: ${message.content}`);

      // Make streaming request to FastAPI
      await this.streamFromFastAPI(clientId, requestData, wsServer);

    } catch (error) {
      console.error('Error in handleChatMessage:', error);
      wsServer.sendError(clientId, 'Failed to get AI response');
    }
  }

  async streamFromFastAPI(clientId, requestData, wsServer) {
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.fastApiUrl}/api/v1/chat/ai-response`,
        data: requestData,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        responseType: 'stream',
        timeout: 60000 // 60 seconds timeout
      });

      let buffer = '';
      let messageId = this.generateMessageId();
      
      // Send start streaming message
      wsServer.sendMessage(clientId, {
        type: 'stream-start',
        messageId: messageId,
        timestamp: new Date().toISOString()
      });

      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          this.processStreamLine(line, clientId, messageId, wsServer);
        }
      });

      response.data.on('end', () => {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          this.processStreamLine(buffer, clientId, messageId, wsServer);
        }
        
        // Send stream end message
        wsServer.sendMessage(clientId, {
          type: 'stream-end',
          messageId: messageId,
          timestamp: new Date().toISOString()
        });

        console.log(`Streaming completed for client: ${clientId}`);
      });

      response.data.on('error', (error) => {
        console.error('Stream error:', error);
        wsServer.sendError(clientId, 'Stream error occurred');
      });

    } catch (error) {
      console.error('FastAPI request error:', error);
      
      if (error.code === 'ECONNREFUSED') {
        wsServer.sendError(clientId, 'AI service is currently unavailable');
      } else if (error.code === 'TIMEOUT') {
        wsServer.sendError(clientId, 'Request timeout - please try again');
      } else {
        wsServer.sendError(clientId, 'Failed to connect to AI service');
      }
    }
  }

  processStreamLine(line, clientId, messageId, wsServer) {
    line = line.trim();
    if (!line) return;

    try {
      // Handle Server-Sent Events format
      if (line.startsWith('data: ')) {
        const data = line.substring(6); // Remove 'data: ' prefix
        
        if (data === '[DONE]') {
          // Stream completion indicator
          return;
        }

        // Try to parse as JSON (OpenAI format)
        try {
          const parsed = JSON.parse(data);
          
          if (parsed.choices && parsed.choices[0].delta) {
            const delta = parsed.choices[0].delta;
            
            if (delta.content) {
              // Send token to client
              wsServer.sendMessage(clientId, {
                type: 'stream-token',
                messageId: messageId,
                token: delta.content,
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (parseError) {
          // If not JSON, treat as plain text token
          wsServer.sendMessage(clientId, {
            type: 'stream-token',
            messageId: messageId,
            token: data,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        // Handle plain text streaming
        wsServer.sendMessage(clientId, {
          type: 'stream-token',
          messageId: messageId,
          token: line,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error processing stream line:', error);
    }
  }

  buildContext(session) {
    // Build conversation context from session messages
    const recentMessages = session.messages
      .filter(msg => msg.type === 'chat' || msg.type === 'ai-response')
      .slice(-10) // Last 10 messages for context
      .map(msg => ({
        role: msg.from === 'user' ? 'user' : 'assistant',
        content: msg.content || msg.message
      }));

    return {
      conversation_history: recentMessages,
      user_id: session.userId,
      session_start: session.createdAt
    };
  }

  generateMessageId() {
    return 'msg_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Handle different FastAPI response formats
  async handleNonStreamingResponse(clientId, requestData, wsServer) {
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.fastApiUrl}/api/v1/chat/ai-response`,
        data: requestData,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      // Send complete response
      wsServer.sendMessage(clientId, {
        type: 'ai-response',
        message: response.data.response || response.data.message,
        messageId: this.generateMessageId(),
        timestamp: new Date().toISOString()
      });

      // Store in session
      const session = wsServer.getSessionData(clientId);
      if (session) {
        session.messages.push({
          type: 'ai-response',
          message: response.data.response || response.data.message,
          timestamp: new Date(),
          from: 'assistant'
        });
      }

    } catch (error) {
      console.error('Non-streaming request error:', error);
      wsServer.sendError(clientId, 'Failed to get AI response');
    }
  }

  // Health check for FastAPI service
  async checkFastAPIHealth() {
    try {
      const response = await axios.get(`${this.fastApiUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('FastAPI health check failed:', error.message);
      return false;
    }
  }
}

module.exports = MessageHandler;