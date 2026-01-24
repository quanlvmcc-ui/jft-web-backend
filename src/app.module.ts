import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersController } from './users/users.controller';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AppController, UsersController],
  providers: [AppService],
})
export class AppModule {}
