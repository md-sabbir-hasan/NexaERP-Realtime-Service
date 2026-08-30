import amqp, { Channel, ChannelModel } from 'amqplib';
import { env } from '../config/env';
import { NotificationEvent } from '../types';
import { pushNotificationToUser } from '../socket/socketServer';

let connection: ChannelModel | undefined;
let channel: Channel | undefined;

/**
 * Connects to RabbitMQ, declares the exchange/queue/binding (idempotent —
 * safe to run even if the Spring Boot side already declared them), and
 * starts consuming. Each message is expected to be JSON matching
 * NotificationEvent. Requires the Spring Boot producer from Step 2 to be
 * publishing to `env.rabbitmqExchange` — until then this just waits.
 */
export async function startRabbitConsumer(): Promise<void> {
  connection = await amqp.connect(env.rabbitmqUrl);
  channel = await connection.createChannel();

  await channel.assertExchange(env.rabbitmqExchange, 'topic', { durable: true });
  const queue = await channel.assertQueue(env.rabbitmqQueue, { durable: true });
  await channel.bindQueue(queue.queue, env.rabbitmqExchange, env.rabbitmqRoutingKey);

  console.log(
    `[rabbitmq] consuming queue "${queue.queue}" bound to "${env.rabbitmqExchange}" (${env.rabbitmqRoutingKey})`,
  );

  await channel.consume(queue.queue, (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString()) as NotificationEvent;
      pushNotificationToUser(event);
      channel!.ack(msg);
    } catch (err) {
      console.error('[rabbitmq] failed to process message, discarding:', err);
      // nack without requeue — a malformed message will never become valid on retry
      channel!.nack(msg, false, false);
    }
  });

  connection.on('close', () => {
    console.error('[rabbitmq] connection closed, retrying in 5s...');
    setTimeout(() => void startRabbitConsumer(), 5000);
  });
}
