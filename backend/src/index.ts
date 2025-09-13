import dotenv from 'dotenv';
import { createServer } from 'http';
import app from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { SocketManager } from './websocket/socketManager';
import { logger } from './utils/logger';

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = createServer(app);
const socketManager = new SocketManager(server);

// Make socketManager available to routes via app locals
app.locals.socketManager = socketManager;

let isShuttingDown = false;

async function startServer() {
  try {
    await connectDatabase();
    
    server.listen(PORT, () => {
      logger.info(`🚀 CodeClimb Backend Server is running on port ${PORT}`);
      logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🔌 WebSocket server initialized`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info('🛑 Graceful shutdown initiated...');
  
  server.close(async () => {
    logger.info('📡 HTTP server closed');
    
    try {
      await disconnectDatabase();
      logger.info('💾 Database disconnected');
    } catch (error) {
      logger.error('Database disconnection error:', error);
    }
    
    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('⚠️ Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown();
});

if (require.main === module) {
  startServer();
}