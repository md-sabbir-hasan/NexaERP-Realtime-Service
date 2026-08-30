// Mirrors the claims JwtUtil.generateAccessToken() puts into the token
// on the Spring Boot side (see backend/src/main/java/com/nexaerp/security/JwtUtil.java).
export interface NexaJwtPayload {
  sub: string; // email
  userId: number;
  permissions: string[];
  iat: number;
  exp: number;
}

// Shape of the message published by Spring Boot to RabbitMQ whenever a
// notification is created. Keep this in sync with whatever payload the
// backend's RabbitTemplate.convertAndSend(...) call sends.
export interface NotificationEvent {
  notificationId: number;
  userId: number;
  type: string; // one of NotificationType enum values, e.g. INVOICE_POSTED
  title: string;
  message: string;
  createdAt: string; // ISO timestamp
}
