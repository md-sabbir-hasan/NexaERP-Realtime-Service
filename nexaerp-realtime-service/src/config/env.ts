import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 8090),
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:4200').split(','),

  jwtSecret: required('JWT_SECRET'),

  rabbitmqUrl: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
  rabbitmqExchange: process.env.RABBITMQ_EXCHANGE ?? 'nexaerp.notifications',
  rabbitmqQueue: process.env.RABBITMQ_QUEUE ?? 'realtime-service.notifications',
  rabbitmqRoutingKey: process.env.RABBITMQ_ROUTING_KEY ?? 'notification.#',

  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
};
