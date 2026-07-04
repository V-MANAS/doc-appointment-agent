import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import logger from '../logger';
import { env } from '../config/env';

let io: Server;

export const initWebSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`🔌 Real-time client connected: ${socket.id}`);

    socket.on('join_room', (room: string) => {
      socket.join(room);
      logger.debug(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Real-time client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIo = (): Server => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet!');
  }
  return io;
};

export const emitToRoom = (room: string, event: string, data: any): void => {
  if (io) {
    io.to(room).emit(event, data);
    logger.debug(`[WS Room: ${room}] Emitted: ${event}`);
  }
};

export const broadcastEvent = (event: string, data: any): void => {
  if (io) {
    io.emit(event, data);
    logger.debug(`[WS Broadcast] Emitted: ${event}`);
  }
};
