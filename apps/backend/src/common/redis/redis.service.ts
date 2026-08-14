import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Simple in-memory store used when Redis is not configured
interface MemEntry { value: string; expires: number | null }

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private memory = new Map<string, MemEntry>();
  private useMemory = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('redis.host');

    if (!host || host === 'disabled') {
      this.useMemory = true;
      this.logger.warn('Redis not configured — using in-memory store (single-instance only)');
      return;
    }

    try {
      this.client = new Redis({
        host,
        port: this.configService.get<number>('redis.port'),
        password: this.configService.get<string>('redis.password') || undefined,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      this.client.on('connect', () => this.logger.log('Redis connected'));
      this.client.on('error', (err) => {
        this.logger.error('Redis error — falling back to in-memory:', err.message);
        this.useMemory = true;
        this.client = null;
      });
      this.client.on('ready', () => this.logger.log('Redis ready'));
    } catch {
      this.useMemory = true;
      this.logger.warn('Redis init failed — using in-memory store');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis disconnected');
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  private memGet(key: string): string | null {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expires !== null && Date.now() > entry.expires) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  async get(key: string): Promise<string | null> {
    if (this.useMemory) return this.memGet(key);
    return this.client!.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.useMemory) {
      this.memory.set(key, {
        value,
        expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
      });
      return;
    }
    if (ttlSeconds) {
      await this.client!.setex(key, ttlSeconds, value);
    } else {
      await this.client!.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (this.useMemory) { this.memory.delete(key); return; }
    await this.client!.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (this.useMemory) return this.memGet(key) !== null;
    const result = await this.client!.exists(key);
    return result === 1;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  async incr(key: string): Promise<number> {
    if (this.useMemory) {
      const cur = parseInt(this.memGet(key) || '0', 10) + 1;
      this.memory.set(key, { value: String(cur), expires: null });
      return cur;
    }
    return this.client!.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (this.useMemory) {
      const entry = this.memory.get(key);
      if (entry) entry.expires = Date.now() + ttlSeconds * 1000;
      return;
    }
    await this.client!.expire(key, ttlSeconds);
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.useMemory) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return [...this.memory.keys()].filter(k => regex.test(k));
    }
    return this.client!.keys(pattern);
  }

  async flushPattern(pattern: string): Promise<void> {
    const keys = await this.keys(pattern);
    await Promise.all(keys.map(k => this.del(k)));
  }

  async checkIdempotencyKey(key: string): Promise<string | null> {
    return this.get(`idempotency:${key}`);
  }

  async setIdempotencyKey(key: string, result: string, ttlSeconds = 86400): Promise<void> {
    await this.set(`idempotency:${key}`, result, ttlSeconds);
  }

  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.set(`blacklist:${jti}`, '1', ttlSeconds);
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    return this.exists(`blacklist:${jti}`);
  }
}
