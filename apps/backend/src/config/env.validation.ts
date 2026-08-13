import * as Joi from 'joi';

export function validate(config: Record<string, unknown>) {
  const schema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
    PORT: Joi.number().default(3001),

    // Database
    DATABASE_URL: Joi.string().required(),

    // JWT
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRATION: Joi.string().default('15m'),
    JWT_REFRESH_SECRET: Joi.string().min(32).required(),
    JWT_REFRESH_EXPIRATION: Joi.string().default('30d'),

    // Redis
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().optional().allow(''),

    // Stripe
    STRIPE_SECRET_KEY: Joi.string().required(),
    STRIPE_WEBHOOK_SECRET: Joi.string().required(),
    STRIPE_SUBSCRIPTION_PRICE_ID: Joi.string().required(),
    STRIPE_PLATFORM_FEE_RATE: Joi.number().default(0.01),

    // App
    ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),
    FRONTEND_URL: Joi.string().default('http://localhost:3000'),

    // Email
    SMTP_HOST: Joi.string().default('localhost'),
    SMTP_PORT: Joi.number().default(1025),
    SMTP_USER: Joi.string().optional().allow(''),
    SMTP_PASS: Joi.string().optional().allow(''),
    EMAIL_FROM: Joi.string().email().default('noreply@tapflow.app'),

    // Storage (S3/MinIO)
    STORAGE_ENDPOINT: Joi.string().optional(),
    STORAGE_ACCESS_KEY: Joi.string().optional(),
    STORAGE_SECRET_KEY: Joi.string().optional(),
    STORAGE_BUCKET: Joi.string().default('tapflow'),
    STORAGE_REGION: Joi.string().default('us-east-1'),

    // Admin
    ADMIN_EMAIL: Joi.string().email().optional(),
    ADMIN_SECRET: Joi.string().optional(),
  });

  const { error, value } = schema.validate(config, { allowUnknown: true });

  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }

  return value;
}
