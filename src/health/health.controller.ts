import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { HealthService, HealthCheckResponse } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Health check endpoint (no authentication required)
   * Returns 200 if database is connected, 500 if disconnected
   *
   * GET /health
   *
   * Success Response (200):
   * {
   *   "status": "ok",
   *   "database": "connected",
   *   "timestamp": "2026-02-27T10:30:45.123Z",
   *   "uptime": 3600
   * }
   *
   * Error Response (500):
   * {
   *   "status": "error",
   *   "database": "disconnected",
   *   "timestamp": "2026-02-27T10:30:45.123Z",
   *   "uptime": 3600
   * }
   */
  @Get()
  async getHealth(): Promise<HealthCheckResponse> {
    const health = await this.healthService.check();

    // If database is disconnected, return 500 status
    if (health.status === 'error') {
      throw new HttpException(health, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return health;
  }
}
