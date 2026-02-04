import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
