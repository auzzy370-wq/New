"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const Joi = require("joi");
function validate(config) {
    const schema = Joi.object({
        NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
        PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION: Joi.string().default('15m'),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRATION: Joi.string().default('30d'),
        REDIS_HOST: Joi.string().optional().allow('').default(''),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().optional().allow(''),
        STRIPE_SECRET_KEY: Joi.string().optional().allow('').default(''),
        STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow('').default(''),
        STRIPE_SUBSCRIPTION_PRICE_ID: Joi.string().optional().allow('').default(''),
        STRIPE_PLATFORM_FEE_RATE: Joi.number().default(0.01),
        ALLOWED_ORIGINS: Joi.string().allow('').default('http://localhost:3000'),
        FRONTEND_URL: Joi.string().allow('').default('http://localhost:3000'),
        SMTP_HOST: Joi.string().allow('').default(''),
        SMTP_PORT: Joi.number().default(1025),
        SMTP_USER: Joi.string().optional().allow(''),
        SMTP_PASS: Joi.string().optional().allow(''),
        EMAIL_FROM: Joi.string().allow('').default('noreply@tapflow.app'),
        STORAGE_ENDPOINT: Joi.string().optional(),
        STORAGE_ACCESS_KEY: Joi.string().optional(),
        STORAGE_SECRET_KEY: Joi.string().optional(),
        STORAGE_BUCKET: Joi.string().default('tapflow'),
        STORAGE_REGION: Joi.string().default('us-east-1'),
        ADMIN_EMAIL: Joi.string().email().optional(),
        ADMIN_SECRET: Joi.string().optional(),
    });
    const { error, value } = schema.validate(config, { allowUnknown: true });
    if (error) {
        throw new Error(`Config validation error: ${error.message}`);
    }
    return value;
}
//# sourceMappingURL=env.validation.js.map