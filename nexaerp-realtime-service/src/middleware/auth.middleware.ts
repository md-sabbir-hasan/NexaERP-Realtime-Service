import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { env } from '../config/env';
import { NexaJwtPayload } from '../types';

// Augment Socket with the authenticated user, set after a successful handshake.
declare module 'socket.io' {
  interface Socket {
    userId?: number;
    userEmail?: string;
  }
}

/**
 * IMPORTANT: NexaERP's backend signs tokens with jjwt's Keys.hmacShaKeyFor(),
 * which auto-selects the HMAC algorithm from the secret's byte length
 * (>=64 bytes -> HS512, >=48 -> HS384, >=32 -> HS256). With the default
 * secret in application.properties (71 bytes) the backend actually signs
 * with HS512, not HS256. If you change the secret, re-check its length and
 * update `algorithms` below to match — a mismatch here fails verification
 * for every token even though the secret itself is correct.
 */
const TOKEN_ALGORITHMS: jwt.Algorithm[] = ['HS512'];

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const token =
    (socket.handshake.auth?.token as string | undefined) ??
    (socket.handshake.headers?.authorization?.toString().replace(/^Bearer\s+/i, '') as
      | string
      | undefined);

  if (!token) {
    return next(new Error('AUTH_NO_TOKEN'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      algorithms: TOKEN_ALGORITHMS,
    }) as NexaJwtPayload;

    socket.userId = payload.userId;
    socket.userEmail = payload.sub;
    next();
  } catch (err) {
    next(new Error('AUTH_INVALID_TOKEN'));
  }
}
