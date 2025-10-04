# WebSocket Chat API Integration Guide

## WebSocket Connection

**URL:** `ws://localhost:3001`  
**Authentication:** Query parameter with JWT token  
**Example:** `ws://localhost:3001?token=YOUR_JWT_TOKEN`

## Connection Setup

```javascript
const token = localStorage.getItem('token'); // Get from login API
const websocket = new WebSocket(`ws://localhost:3001?token=${token}`);

websocket.onopen = (event) => {
  console.log('WebSocket connected!');
};

websocket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleIncomingMessage(message);
};

websocket.onclose = (event) => {
  console.log('WebSocket disconnected');
};

websocket.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

## Outgoing Message Types

### Send Chat Message

```javascript
const chatMessage = {
  type: 'chat',
  content: 'Your message here',
  timestamp: new Date().toISOString()
};

websocket.send(JSON.stringify(chatMessage));
```

### Request Human Help

```javascript
const escalationMessage = {
  type: 'human-escalation',
  reason: 'Need human assistance',
  timestamp: new Date().toISOString()
};

websocket.send(JSON.stringify(escalationMessage));
```

### Keep Connection Alive

```javascript
const pingMessage = {
  type: 'ping',
  timestamp: new Date().toISOString()
};

websocket.send(JSON.stringify(pingMessage));
```

## Incoming Message Types & Handling

### Connection Established

```javascript
{
  type: 'connection',
  message: 'Connected to chatbot server',
  timestamp: '2025-09-12T...'
}
```

### AI Response Streaming

```javascript
// Response starts
{
  type: 'stream-start',
  messageId: 'msg_abc123',
  timestamp: '2025-09-12T...'
}

// Each word/token (multiple messages)
{
  type: 'stream-token',
  messageId: 'msg_abc123',
  token: 'Hello',
  timestamp: '2025-09-12T...'
}

// Response complete
{
  type: 'stream-end',
  messageId: 'msg_abc123',
  timestamp: '2025-09-12T...'
}
```

### Other Message Types

```javascript
// Human escalation response
{
  type: 'human-escalation-response',
  message: 'A human agent will contact you soon.',
  timestamp: '2025-09-12T...'
}

// Error messages
{
  type: 'error',
  message: 'Error description',
  timestamp: '2025-09-12T...'
}

// Ping response
{
  type: 'pong',
  timestamp: '2025-09-12T...'
}
```

## Message Handler Example

```javascript
function handleIncomingMessage(message) {
  switch(message.type) {
    case 'connection':
      showSystemMessage(message.message);
      break;
      
    case 'stream-start':
      createNewAIMessage(message.messageId);
      break;
      
    case 'stream-token':
      appendToAIMessage(message.messageId, message.token);
      break;
      
    case 'stream-end':
      finalizeAIMessage(message.messageId);
      break;
      
    case 'human-escalation-response':
      showSystemMessage(message.message);
      break;
      
    case 'error':
      showError(message.message);
      break;
      
    case 'pong':
      console.log('Connection alive');
      break;
  }
}
```

## Key Requirements

- **Authentication**: JWT token required in WebSocket URL
- **Message Format**: All messages must be JSON with `type` field
- **Real-time Streaming**: Handle `stream-token` messages to build AI responses
- **Connection Management**: Implement reconnection logic for dropped connections
- **Keep-alive**: Send periodic `ping` messages (every 30 seconds recommended)

## Message Flow Diagram

```
Client                          WebSocket Server                    FastAPI
  |                                    |                              |
  |-- Connect with JWT token --------->|                              |
  |<-- Connection confirmed ------------|                              |
  |                                    |                              |
  |-- Send chat message -------------->|                              |
  |                                    |-- Forward with user context->|
  |<-- stream-start -------------------|                              |
  |<-- stream-token (multiple) --------|<-- AI response streaming ----|
  |<-- stream-end ----------------------|                              |
  |                                    |                              |
  |-- ping --------------------------->|                              |
  |<-- pong ---------------------------|                              |
```

## Error Handling

### Connection Errors
- Invalid or missing JWT token
- Network connectivity issues
- Server unavailable

### Message Errors
- Invalid message format
- Unsupported message types
- Processing failures

### Best Practices
- Always validate token before connecting
- Implement auto-reconnection logic
- Handle all message types gracefully
- Maintain connection with periodic pings
- Store and display message history
- Provide user feedback for all states

---

**This documentation covers everything needed to implement WebSocket chat functionality with the Node.js server.**