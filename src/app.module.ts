import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import type { CacheModuleOptions } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ExamsModule } from './exams/exams.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { QuestionsModule } from './questions/questions.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    /**
     * CacheModule (isGlobal: true) → inject được vào bất kỳ module nào mà không cần import lại.
     *
     * Logic chọn store:
     *  - Có REDIS_URL  → dùng Redis qua @keyv/redis (production / staging)
     *  - Không có      → dùng default in-memory của cache-manager (dev local)
     *
     * TTL mặc định để undefined, mỗi lệnh .set() sẽ truyền TTL riêng cho linh hoạt.
     */
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (): CacheModuleOptions => {
        if (process.env.REDIS_URL) {
          return {
            stores: createKeyv(process.env.REDIS_URL),
          };
        }
        // Không có REDIS_URL → cache-manager dùng lru-cache in-memory tự động
        return {};
      },
    }),
    AuthModule,
    PrismaModule,
    ExamsModule,
    HealthModule,
    UsersModule,
    QuestionsModule, // ✅ UC-06: Questions Management
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
