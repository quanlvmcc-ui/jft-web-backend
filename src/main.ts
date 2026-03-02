import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🛡️ Security: Helmet - Set HTTP security headers
  app.use(
    helmet({
      // Content Security Policy - ngăn chặn XSS và injection attacks
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Cho phép inline styles (cẩn thận!)
          scriptSrc: ["'self'"], // Chỉ cho phép scripts từ cùng origin
          imgSrc: ["'self'", 'data:', 'https:'], // Cho phép images từ https
        },
      },
      // Cross-Origin-Embedder-Policy
      crossOriginEmbedderPolicy: false, // Tắt vì có thể gây xung đột với CORS
      // Cross-Origin-Opener-Policy
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      // Cross-Origin-Resource-Policy
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Cho phép cross-origin requests
    }),
  );

  const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:3000',
    'https://vjlink-edu.online',
    'https://www.vjlink-edu.online',
    'https://app.vjlink-edu.online',
    'https://backend.vjlink-edu.online',
    'https://api.vjlink-edu.online',
    ...(process.env.CORS_ORIGIN?.split(',') || []),
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
