import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ExamsModule } from './exams/exams.module';
import { UsersController } from './users/users.controller';
import { HealthModule } from './health/health.module';

@Module({
  imports: [AuthModule, PrismaModule, ExamsModule, HealthModule],
  controllers: [AppController, UsersController],
  providers: [AppService],
})
export class AppModule {}
