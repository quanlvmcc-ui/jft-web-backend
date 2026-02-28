import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('/health (GET)', () => {
    it('should return health status when database is connected', async () => {
      const healthResponse = {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: 100,
      };

      jest.spyOn(service, 'check').mockResolvedValue(healthResponse);

      const result = await controller.getHealth();

      expect(result).toEqual(healthResponse);
      expect(result.status).toBe('ok');
      expect(result.database).toBe('connected');
      expect(service.check).toHaveBeenCalled();
    });

    it('should throw error when database is disconnected', async () => {
      const healthResponse = {
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: 100,
      };

      jest.spyOn(service, 'check').mockResolvedValue(healthResponse);

      try {
        await controller.getHealth();
        fail('Should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });

    it('should include uptime in response', async () => {
      const healthResponse = {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: 3600, // 1 hour
      };

      jest.spyOn(service, 'check').mockResolvedValue(healthResponse);

      const result = await controller.getHealth();

      expect(result.uptime).toBeGreaterThan(0);
      expect(typeof result.uptime).toBe('number');
    });

    it('should include ISO timestamp in response', async () => {
      const healthResponse = {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: 100,
      };

      jest.spyOn(service, 'check').mockResolvedValue(healthResponse);

      const result = await controller.getHealth();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
