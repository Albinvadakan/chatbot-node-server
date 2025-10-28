const printServerInfo = (port, pythonApiHealthy) => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    Chatbot Server Started                    ║
╠══════════════════════════════════════════════════════════════╣
║ HTTP Server: http://localhost:${port}                        ║
║ WebSocket: ws://localhost:${port}/ws                         ║
║ Health Check: http://localhost:${port}/health                ║
║ API Docs: http://localhost:${port}/api/websocket/info        ║
╠══════════════════════════════════════════════════════════════╣
║ Environment: ${process.env.NODE_ENV || 'development'}        ║
║ MongoDB: Connected                                           ║
║ Python AI API: ${pythonApiHealthy ? 'Connected' : 'Disconnected'}║
╚══════════════════════════════════════════════════════════════╝
  `);
};

module.exports = {
  printServerInfo
};