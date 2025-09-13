# Python AI API Integration Guide

This document explains how the Node.js WebSocket chatbot server integrates with your Python FastAPI service.

## Overview

The integration allows your WebSocket chatbot to:
1. Receive chat messages from clients via WebSocket
2. Forward queries to your Python FastAPI endpoint
3. Return AI responses with patient context back to clients

## API Integration Flow

```
Client App → WebSocket → Node.js Server → Python FastAPI → Node.js Server → WebSocket → Client App
```

### Message Flow Details

1. **Client sends message:**
   ```javascript
   {
     "type": "chat",
     "message": "What are the patient's symptoms?"
   }
   ```

2. **Node.js server calls Python API:**
   ```http
   POST http://localhost:8000/api/v1/chat/ai-response
   Content-Type: application/json
   
   {
     "query": "What are the patient's symptoms?"
   }
   ```

3. **Python API responds:**
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

4. **Node.js server sends to client:**
   ```javascript
   {
     "type": "ai-response",
     "messageId": "msg_abc123_1694606123456",
     "message": "AI-generated contextual response...",
     "timestamp": "2025-09-13T11:30:45.123Z",
     "patient_context": [...]
   }
   ```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Python FastAPI Configuration
FASTAPI_URL=http://localhost:8000

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### Python API Requirements

Your Python FastAPI service must:

1. **Accept POST requests** at `/api/v1/chat/ai-response`
2. **Request format:**
   - `query`: string (1-2000 characters)
3. **Response format:**
   - `response`: string (required)
   - `patient_context`: array (optional)
   - `timestamp`: string (optional)

## Usage

### Starting the Services

1. **Start Python FastAPI:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

2. **Start Node.js server:**
   ```bash
   npm run dev
   ```

### Testing the Integration

Run the integration test:
```bash
node test-python-integration.js
```

### WebSocket Client Example

```javascript
const ws = new WebSocket('ws://localhost:3001?token=YOUR_JWT_TOKEN');

// Send chat message
ws.send(JSON.stringify({
  type: 'chat',
  message: 'What are the patient\'s symptoms?'
}));

// Handle responses
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'typing':
      console.log('AI is thinking...');
      break;
      
    case 'ai-response':
      console.log('AI Response:', data.message);
      console.log('Patient Context:', data.patient_context);
      break;
      
    case 'error':
      console.error('Error:', data.message);
      break;
  }
};
```

## Error Handling

The system handles various error scenarios:

### Connection Errors
- **ECONNREFUSED**: Python API is not running
- **TIMEOUT**: Request takes too long
- **ENOTFOUND**: Invalid API URL

### API Errors
- **400**: Bad request (invalid query format)
- **500**: Internal server error in Python API
- **429**: Rate limiting (if implemented)

### Client Errors
- Empty message content
- Message too long (>2000 characters)
- Invalid message format

## Message Validation

The server validates all incoming messages:

```javascript
// Valid message formats:
{ "type": "chat", "message": "Your query here" }
{ "type": "chat", "content": "Your query here" }
{ "type": "chat", "query": "Your query here" }

// Query constraints:
- Must be a string
- Cannot be empty
- Maximum 2000 characters
- Automatically trimmed
```

## Session Management

Each WebSocket connection maintains:
- User session data
- Message history
- Connection metadata
- Error tracking

Messages are stored in session for context and debugging.

## Security Considerations

1. **JWT Authentication**: All WebSocket connections require valid JWT tokens
2. **CORS Protection**: Configure allowed origins
3. **Input Validation**: All queries are validated and sanitized
4. **Rate Limiting**: Consider implementing rate limiting for API calls
5. **Error Exposure**: Sensitive error details are not exposed to clients

## Monitoring and Logging

The server logs:
- WebSocket connections/disconnections
- API calls to Python service
- Response times and errors
- Message validation failures

Example log output:
```
2025-09-13T11:30:45.123Z - WebSocket connected: user123 (client_abc123)
Forwarding chat message to Python AI API: What are the patient's symptoms?
AI response sent to client client_abc123: Based on the medical records...
```

## Troubleshooting

### Common Issues

1. **Connection refused to Python API**
   - Ensure Python FastAPI is running
   - Check FASTAPI_URL in .env
   - Verify port availability

2. **Invalid response format**
   - Ensure Python API returns required fields
   - Check response JSON structure
   - Validate data types

3. **WebSocket connection issues**
   - Verify JWT token is valid
   - Check CORS configuration
   - Ensure client uses correct URL format

4. **Message validation errors**
   - Check message content length
   - Ensure message is not empty
   - Verify JSON format

### Debug Mode

Set `NODE_ENV=development` for detailed logging:
```bash
NODE_ENV=development npm run dev
```

This enables verbose logging of all API calls and responses.