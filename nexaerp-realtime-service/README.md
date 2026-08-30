# nexaerp-realtime-service

Real-time notification delivery microservice for NexaERP. Listens for
notification events on RabbitMQ (published by the Spring Boot backend) and
pushes them instantly to connected users over Socket.io.

This service does **not** own notification data — the Spring Boot backend's
MySQL `notifications` table stays the single source of truth. This service is
purely a delivery layer: if it is down, NexaERP keeps working normally and
users just fall back to the existing pull-based bell icon.

## Architecture

```
Spring Boot (save notification) --publish--> RabbitMQ --consume--> this service --Socket.io--> Angular
```

## Prerequisites

- Node.js 18+
- RabbitMQ running locally: `docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management`
- Redis running locally: `docker run -d --name redis -p 6379:6379 redis:7`
- NexaERP backend running with the RabbitMQ producer added (see "Spring Boot side" below)

## Setup

```bash
npm install
cp .env.example .env
# edit .env — JWT_SECRET must exactly match app.jwt.secret in NexaERP's application.properties
npm run dev
```

Health check: `GET http://localhost:8090/health`

## JWT algorithm gotcha

NexaERP's `JwtUtil` signs tokens using jjwt's `Keys.hmacShaKeyFor(secret)`,
which **auto-selects the HMAC algorithm based on the secret's byte length**
(HS256 at 32+ bytes, HS384 at 48+, HS512 at 64+). The default secret shipped
in `application.properties` is 71 bytes, so tokens are actually signed with
**HS512**. `src/middleware/auth.middleware.ts` is hardcoded to verify with
HS512 to match. If you change the secret's length, update the `algorithms`
array in that file accordingly, or verification will fail for every user.

## Spring Boot side (Step 2 — not part of this repo)

Add to `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

In `NotificationServiceImpl`, after the notification is saved to the DB,
publish an event with the same exchange/routing-key convention this service
expects (`nexaerp.notifications` exchange, `notification.#` routing key —
see `.env.example`):

```java
rabbitTemplate.convertAndSend(
    "nexaerp.notifications",
    "notification." + type.name().toLowerCase(),
    Map.of(
        "notificationId", saved.getId(),
        "userId", saved.getUserId(),
        "type", saved.getType().name(),
        "title", saved.getTitle(),
        "message", saved.getMessage(),
        "createdAt", saved.getCreatedAt().toString()
    )
);
```

## Angular side (Step 6 — not part of this repo)

```bash
npm install socket.io-client
```

Connect with the existing access token and listen for `notification:new`,
then feed it into the existing `NotificationStore` signals
(`notifications.update(...)`, `unreadCount.update(...)`).

## Project structure

```
src/
  config/       env + redis setup
  middleware/   Socket.io JWT auth
  mq/           RabbitMQ consumer
  socket/       Socket.io server + room management
  types/        shared TS interfaces
  server.ts     entry point
```
