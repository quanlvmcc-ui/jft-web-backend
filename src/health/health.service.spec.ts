import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('check()', () => {
    it('should return ok status when database is connected', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([{ count: 1 }]);

      const result = await service.check();

      expect(result.status).toBe('ok');
      expect(result.database).toBe('connected');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return error status when database is disconnected', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockRejectedValue(new Error('Connection failed'));

      const result = await service.check();

      expect(result.status).toBe('error');
      expect(result.database).toBe('disconnected');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include current timestamp', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([{ count: 1 }]);

      const beforeCheck = new Date();
      const result = await service.check();
      const afterCheck = new Date();

      const resultTime = new Date(result.timestamp);
      expect(resultTime.getTime()).toBeGreaterThanOrEqual(
        beforeCheck.getTime(),
      );
      expect(resultTime.getTime()).toBeLessThanOrEqual(afterCheck.getTime());
    });

    it('should calculate uptime correctly', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([{ count: 1 }]);

      // Wait a bit to ensure uptime > 0
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await service.check();

      expect(result.uptime).toBeGreaterThan(0);
      expect(typeof result.uptime).toBe('number');
    });

    it('should handle database query errors gracefully', async () => {
      const testError = new Error('ECONNREFUSED: Connection refused');
      jest.spyOn(prismaService, '$queryRaw').mockRejectedValue(testError);

      const result = await service.check();

      expect(result.status).toBe('error');
      expect(result.database).toBe('disconnected');
      // Should not throw, should return error response
      expect(result).toBeDefined();
    });
  });
});
