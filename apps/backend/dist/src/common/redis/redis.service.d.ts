import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private configService;
    private readonly logger;
    private client;
    private memory;
    private useMemory;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    getClient(): Redis | null;
    private memGet;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    getJson<T>(key: string): Promise<T | null>;
    incr(key: string): Promise<number>;
    expire(key: string, ttlSeconds: number): Promise<void>;
    keys(pattern: string): Promise<string[]>;
    flushPattern(pattern: string): Promise<void>;
    checkIdempotencyKey(key: string): Promise<string | null>;
    setIdempotencyKey(key: string, result: string, ttlSeconds?: number): Promise<void>;
    blacklistToken(jti: string, ttlSeconds: number): Promise<void>;
    isTokenBlacklisted(jti: string): Promise<boolean>;
}
