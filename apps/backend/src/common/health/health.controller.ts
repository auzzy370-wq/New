import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        redis: 'unknown',
      },
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.services.database = 'ok';
    } catch {
      checks.services.database = 'error';
      checks.status = 'degraded';
    }

    try {
      const client = this.redis.getClient();
      if (client) {
        await client.ping();
        checks.services.redis = 'ok';
      } else {
        checks.services.redis = 'in-memory';
      }
    } catch {
      checks.services.redis = 'in-memory';
    }

    return checks;
  }
}
