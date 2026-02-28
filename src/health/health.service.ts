import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  timestamp: string;
  uptime: number;
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  /**
   * Perform a comprehensive health check
   * Checks database connectivity and returns system status
   */
  async check(): Promise<HealthCheckResponse> {
    try {
      // Check database connectivity with raw query
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
      };
    }
  }
}
