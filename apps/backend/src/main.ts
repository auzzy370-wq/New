import { NestFactory, Reflector } from '@nestjs/core';
import { Decimal } from '@prisma/client/runtime/library';
import { AppModule } from './app.module';

// Prisma Decimal fields serialize as { s, e, d } objects by default.
// Override toJSON so they become plain numbers in all API responses.
(Decimal.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return this.toNumber();
};
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Merchant-ID', 'X-Idempotency-Key'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['/health', '/api/webhooks/stripe'],
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global interceptors
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger API Documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TapFlow POS API')
      .setDescription('Production-ready POS SaaS Platform API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addApiKey({ type: 'apiKey', name: 'X-Merchant-ID', in: 'header' }, 'MerchantID')
      .addTag('auth', 'Authentication endpoints')
      .addTag('merchants', 'Merchant management')
      .addTag('users', 'User management')
      .addTag('locations', 'Location management')
      .addTag('products', 'Product catalog')
      .addTag('inventory', 'Inventory management')
      .addTag('customers', 'Customer management')
      .addTag('orders', 'Order management')
      .addTag('payments', 'Payment processing')
      .addTag('refunds', 'Refund management')
      .addTag('subscriptions', 'Subscription management')
      .addTag('reports', 'Analytics and reporting')
      .addTag('employees', 'Employee management')
      .addTag('devices', 'Device management')
      .addTag('registers', 'Register sessions')
      .addTag('webhooks', 'Webhook handling')
      .addTag('admin', 'Platform admin')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`TapFlow POS Backend running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`API Docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
