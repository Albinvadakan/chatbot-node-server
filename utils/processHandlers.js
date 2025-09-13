const gracefulShutdown = async (server, wsServer, authService) => {
  return async (signal) => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    
    try {
      // Close WebSocket connections
      if (wsServer) {
        console.log('Closing WebSocket connections...');
        wsServer.cleanup();
      }

      // Close HTTP server
      console.log('Closing HTTP server...');
      await new Promise((resolve) => {
        server.close(resolve);
      });

      // Close MongoDB connection
      console.log('Closing MongoDB connection...');
      await authService.disconnect();

      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };
};

const setupProcessHandlers = (server, wsServer, authService) => {
  const shutdownHandler = gracefulShutdown(server, wsServer, authService);

  // Handle different termination signals
  process.on('SIGTERM', (signal) => shutdownHandler(signal));
  process.on('SIGINT', (signal) => shutdownHandler(signal));
  process.on('SIGUSR2', (signal) => shutdownHandler(signal)); // Nodemon restart
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdownHandler('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdownHandler('unhandledRejection');
  });
};

module.exports = {
  gracefulShutdown,
  setupProcessHandlers
};