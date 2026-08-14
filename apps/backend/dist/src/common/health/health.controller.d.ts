import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
export declare class HealthController {
    private readonly prisma;
    private readonly redis;
    constructor(prisma: PrismaService, redis: RedisService);
    check(): Promise<{
        status: string;
        timestamp: string;
        services: {
            database: string;
            redis: string;
        };
    }>;
}
