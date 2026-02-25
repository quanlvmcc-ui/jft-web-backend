import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Cấu hình CORS cho phép frontend truy cập
  // Hỗ trợ multiple origins: local development, Render production, Netlify, etc.
  const allowedOrigins = [
    'http://localhost:3001', // Local development
    'https://amazing-moxie-d28a64.netlify.app', // Netlify production (legacy)
    'https://jft-web-frontend.onrender.com', // Render production
    'https://app.dichvumarketing.site', // Custom production
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
