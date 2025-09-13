# Chatbot Server Node.js

A WebSocket-based chatbot server with authentication, built with Node.js, Express, MongoDB Atlas, and JWT. Features integration with Python FastAPI for AI-powered medical chat responses.

## Features

- 🔐 **JWT Authentication** with MongoDB Atlas
- 🔌 **WebSocket Server** with real-time communication
- 🤖 **Python AI Integration** with FastAPI medical chat endpoint
- 🏥 **Medical Context Support** with patient record integration
- 👥 **Human Escalation** support
- 📝 **Session Management** with in-memory storage
- ⚡ **Real-time Responses** from Python AI service
- ❤️ **Health monitoring** and graceful shutdown
- 🛡️ **Input Validation** and error handling

## Prerequisites

- Node.js 16+ 
- MongoDB Atlas account
- Python FastAPI server running on port 8000 (for AI responses)

## Installation

1. **Clone and install dependencies:**
   ```bash
   cd chatbot-server-node
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env
   ```

3. **Configure `.env` file:**
   ```env
   PORT=3001
   NODE_ENV=development
   
   # MongoDB Atlas - Replace with your connection string
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatbot?retryWrites=true&w=majority
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
   JWT_EXPIRES_IN=24h
   
   # Python FastAPI Configuration
   FASTAPI_URL=http://localhost:8000
   
   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   ```

## Quick Start

1. **Start the server:**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

2. **Server will start on:** `http://localhost:3001`

3. **WebSocket endpoint:** `ws://localhost:3001/ws`

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `POST /api/auth/verify` - Token verification

### Server Information

- `GET /health` - Health check
- `GET /api/stats` - Server statistics
- `GET /api/websocket/info` - WebSocket connection info

## WebSocket Usage

### 1. Authentication
Connect with JWT token as query parameter:
```javascript
const ws = new WebSocket('ws://localhost:3001/ws?token=your-jwt-token');
```

Or in Authorization header during connection.

### 2. Message Types

**Chat Message:**
```json
{
  "type": "chat",
  "content": "Hello, how can you help me?"
}
```

**Human Escalation:**
```json
{
  "type": "human-escalation",
  "message": "I need to speak with a human agent"
}
```

**Ping:**
```json
{
  "type": "ping"
}
```

### 3. Response Types

**Streaming Token:**
```json
{
  "type": "stream-token",
  "messageId": "msg_abc123",
  "token": "Hello",
  "timestamp": "2025-09-12T10:30:00.000Z"
}
```

**Stream Start/End:**
```json
{
  "type": "stream-start",
  "messageId": "msg_abc123",
  "timestamp": "2025-09-12T10:30:00.000Z"
}
```

**Human Escalation Response:**
```json
{
  "type": "human-escalation-response",
  "message": "A human agent will contact you soon.",
  "timestamp": "2025-09-12T10:30:00.000Z"
}
```

**Error:**
```json
{
  "type": "error",
  "message": "Invalid message format",
  "timestamp": "2025-09-12T10:30:00.000Z"
}
```

## Usage Examples

### 1. User Authentication
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123"}'
```

### 2. WebSocket Client (JavaScript)
```javascript
// Connect with token
const token = 'your-jwt-token';
const ws = new WebSocket(`ws://localhost:3001/ws?token=${token}`);

ws.onopen = () => {
  console.log('Connected to chatbot server');
  
  // Send chat message
  ws.send(JSON.stringify({
    type: 'chat',
    content: 'Hello, how are you?'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch(message.type) {
    case 'stream-token':
      // Handle streaming token
      process.stdout.write(message.token);
      break;
      
    case 'stream-end':
      console.log('\nStream completed');
      break;
      
    case 'human-escalation-response':
      console.log('Human agent response:', message.message);
      break;
  }
};
```

## Python AI Integration

This server integrates with a Python FastAPI service for AI-powered medical chat responses.

### API Requirements

The Python FastAPI service must provide an endpoint at `/api/v1/chat/ai-response` that:

1. **Accepts POST requests** with:
   ```json
   {
     "query": "What are the patient's symptoms?"
   }
   ```

2. **Returns JSON responses** with:
   ```json
   {
     "response": "AI-generated contextual response...",
     "patient_context": [
       {
         "record_id": "chunk_abc123",
         "content": "Relevant patient record excerpt...",
         "score": 0.895,
         "metadata": {
           "patient_id": "PATIENT_001",
           "source": "medical_report.pdf"
         }
       }
     ],
     "timestamp": "2025-09-13T11:30:45.123Z"
   }
   ```

### Testing the Integration

Test your Python API connection:
```bash
node test-python-integration.js
```

### Configuration

Ensure your Python FastAPI server is running:
```bash
uvicorn main:app --reload --port 8000
```

Set the correct URL in your `.env` file:
```env
FASTAPI_URL=http://localhost:8000
```

For detailed integration documentation, see [PYTHON_INTEGRATION.md](PYTHON_INTEGRATION.md).

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String,
  password: String, // bcrypt hashed
  email: String,
  createdAt: Date,
  lastLogin: Date,
  isActive: Boolean
}
```

## Session Management

Sessions are stored in-memory with:
- User information
- Message history (last 10 for context)
- Connection timestamps
- Client WebSocket references

## Error Handling

The server includes comprehensive error handling for:
- MongoDB connection issues
- FastAPI connectivity problems
- WebSocket connection errors
- JWT token validation
- Malformed messages

## Production Considerations

1. **Environment Variables:**
   - Use strong JWT secrets
   - Configure proper CORS origins
   - Set appropriate MongoDB connection strings

2. **Security:**
   - Implement rate limiting
   - Add input validation
   - Use HTTPS in production
   - Consider session persistence

3. **Scaling:**
   - Replace in-memory sessions with Redis
   - Implement horizontal scaling with sticky sessions
   - Add load balancing for WebSocket connections

4. **Monitoring:**
   - Add logging middleware
   - Implement metrics collection
   - Set up health checks

## Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Check health
curl http://localhost:3001/health
```

## Troubleshooting

**Connection Issues:**
- Verify MongoDB Atlas connectivity
- Check FastAPI server status
- Ensure JWT tokens are valid

**WebSocket Problems:**
- Confirm token authentication
- Check CORS configuration
- Verify WebSocket URL format

**Chat Not Working:**
- Verify FastAPI `/api/v1/chat/ai-response` endpoint
- Check streaming response format
- Confirm network connectivity

## License

MIT License