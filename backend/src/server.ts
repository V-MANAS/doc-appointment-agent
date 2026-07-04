import http from 'http';
import app from './app';
import { env } from './config/env';
import logger from './logger';
import { connectDb } from './infrastructure/database';
import { initWebSocket } from './infrastructure/websocket';
import { initQueues } from './infrastructure/queue';

const server = http.createServer(app);

const startServer = async () => {
  try {
    // 1. Connect to Database (SQLite / Postgres ready)
    await connectDb();

    // 2. Initialize Real-Time Websockets Layer (Socket.IO)
    initWebSocket(server);
    logger.info('🔌 WebSockets (Socket.IO) layer initialized');

    // 3. Initialize Background Queues (BullMQ)
    await initQueues();
    logger.info('🗂️ Background jobs queue system initialized');

    // 4. Listen on PORT
    server.listen(env.PORT, () => {
      logger.info(`🚀 Server running in [${env.NODE_ENV}] mode on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    logger.error('❌ Crash on bootstrap:', error);
    process.exit(1);
  }
};

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception thrown:', error);
  process.exit(1);
});

startServer();
