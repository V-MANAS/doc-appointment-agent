import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import logger from '../utils/logger';


// Client-side logger fallback
const clientLogger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string, err?: any) => console.error(`[ERROR] ${msg}`, err),
};

export const useSocket = (
  eventName?: string,
  callback?: (data: any) => void
) => {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) return;

    // Connect to HTTP Server (which hosts WebSockets on port 5000)
    const socket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      clientLogger.info(`Connected to WebSocket server as socket ID: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      clientLogger.info('Disconnected from WebSocket server');
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !eventName || !callback) return;

    socket.on(eventName, callback);

    return () => {
      socket.off(eventName, callback);
    };
  }, [eventName, callback]);

  const emit = (event: string, data: any) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  return { socket: socketRef.current, emit };
};
export default useSocket;
