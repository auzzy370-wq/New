"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
let RedisService = RedisService_1 = class RedisService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RedisService_1.name);
        this.client = null;
        this.memory = new Map();
        this.useMemory = false;
    }
    onModuleInit() {
        const host = this.configService.get('redis.host');
        if (!host || host === 'disabled') {
            this.useMemory = true;
            this.logger.warn('Redis not configured — using in-memory store (single-instance only)');
            return;
        }
        try {
            this.client = new ioredis_1.default({
                host,
                port: this.configService.get('redis.port'),
                password: this.configService.get('redis.password') || undefined,
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
        }
        catch {
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
    getClient() {
        return this.client;
    }
    memGet(key) {
        const entry = this.memory.get(key);
        if (!entry)
            return null;
        if (entry.expires !== null && Date.now() > entry.expires) {
            this.memory.delete(key);
            return null;
        }
        return entry.value;
    }
    async get(key) {
        if (this.useMemory)
            return this.memGet(key);
        return this.client.get(key);
    }
    async set(key, value, ttlSeconds) {
        if (this.useMemory) {
            this.memory.set(key, {
                value,
                expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
            });
            return;
        }
        if (ttlSeconds) {
            await this.client.setex(key, ttlSeconds, value);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async del(key) {
        if (this.useMemory) {
            this.memory.delete(key);
            return;
        }
        await this.client.del(key);
    }
    async exists(key) {
        if (this.useMemory)
            return this.memGet(key) !== null;
        const result = await this.client.exists(key);
        return result === 1;
    }
    async setJson(key, value, ttlSeconds) {
        await this.set(key, JSON.stringify(value), ttlSeconds);
    }
    async getJson(key) {
        const value = await this.get(key);
        if (!value)
            return null;
        return JSON.parse(value);
    }
    async incr(key) {
        if (this.useMemory) {
            const cur = parseInt(this.memGet(key) || '0', 10) + 1;
            this.memory.set(key, { value: String(cur), expires: null });
            return cur;
        }
        return this.client.incr(key);
    }
    async expire(key, ttlSeconds) {
        if (this.useMemory) {
            const entry = this.memory.get(key);
            if (entry)
                entry.expires = Date.now() + ttlSeconds * 1000;
            return;
        }
        await this.client.expire(key, ttlSeconds);
    }
    async keys(pattern) {
        if (this.useMemory) {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return [...this.memory.keys()].filter(k => regex.test(k));
        }
        return this.client.keys(pattern);
    }
    async flushPattern(pattern) {
        const keys = await this.keys(pattern);
        await Promise.all(keys.map(k => this.del(k)));
    }
    async checkIdempotencyKey(key) {
        return this.get(`idempotency:${key}`);
    }
    async setIdempotencyKey(key, result, ttlSeconds = 86400) {
        await this.set(`idempotency:${key}`, result, ttlSeconds);
    }
    async blacklistToken(jti, ttlSeconds) {
        await this.set(`blacklist:${jti}`, '1', ttlSeconds);
    }
    async isTokenBlacklisted(jti) {
        return this.exists(`blacklist:${jti}`);
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map