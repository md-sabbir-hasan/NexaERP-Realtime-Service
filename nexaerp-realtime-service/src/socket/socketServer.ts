import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { socketAuthMiddleware } from '../middleware/auth.middleware';
import { markUserOnline, markUserOffline } from '../config/redis';
import { NotificationEvent } from '../types';

let io: Server | undefined;

export function userRoom(userId: number): string {
  return `user:${userId}`;
}

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.corsAllowedOrigins,
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket: Socket) => {
    const userId = socket.userId!;
    socket.join(userRoom(userId));
    void markUserOnline(userId);

    console.log(`[socket] user ${userId} connected (${socket.id})`);

    socket.on('disconnect', () => {
      void markUserOffline(userId);
      console.log(`[socket] user ${userId} disconnected (${socket.id})`);
    });
  });

  return io;
}

/** Push a notification event to a specific user's room. Called by the RabbitMQ consumer. */
export function pushNotificationToUser(event: NotificationEvent): void {
  if (!io) {
    throw new Error('Socket.io server not initialized yet');
  }
  io.to(userRoom(event.userId)).emit('notification:new', event);
}
