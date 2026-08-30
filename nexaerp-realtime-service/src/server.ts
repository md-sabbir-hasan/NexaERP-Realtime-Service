import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { env } from './config/env';
import { initSocketServer } from './socket/socketServer';
import { startRabbitConsumer } from './mq/rabbitConsumer';

const app = express();
app.use(cors({ origin: env.corsAllowedOrigins, credentials: true }));

// Simple health check — useful for Docker healthchecks / uptime monitoring later
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'nexaerp-realtime-service' });
});

const httpServer = createServer(app);
initSocketServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(`[server] nexaerp-realtime-service listening on port ${env.port}`);
});

startRabbitConsumer().catch((err) => {
  console.error('[rabbitmq] initial connection failed:', err.message);
  console.error('[rabbitmq] server will keep running; notifications will not be pushed until RabbitMQ is reachable.');
});
