"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const helmet_1 = require("helmet");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    app.use(compression());
    app.use(cookieParser());
    app.enableCors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:3000',
            'http://localhost:3001',
        ],
        credentials: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Merchant-ID', 'X-Idempotency-Key'],
    });
    app.setGlobalPrefix('api/v1', {
        exclude: ['/health', '/api/webhooks/stripe'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    const reflector = app.get(core_1.Reflector);
    app.useGlobalInterceptors(new common_1.ClassSerializerInterceptor(reflector), new logging_interceptor_1.LoggingInterceptor(), new transform_interceptor_1.TransformInterceptor());
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    if (process.env.NODE_ENV !== 'production') {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('TapFlow POS API')
            .setDescription('Production-ready POS SaaS Platform API')
            .setVersion('1.0')
            .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
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
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document, {
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
//# sourceMappingURL=main.js.map