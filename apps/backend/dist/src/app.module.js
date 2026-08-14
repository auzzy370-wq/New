"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const schedule_1 = require("@nestjs/schedule");
const app_config_1 = require("./config/app.config");
const database_config_1 = require("./config/database.config");
const jwt_config_1 = require("./config/jwt.config");
const stripe_config_1 = require("./config/stripe.config");
const redis_config_1 = require("./config/redis.config");
const env_validation_1 = require("./config/env.validation");
const prisma_module_1 = require("./common/prisma/prisma.module");
const redis_module_1 = require("./common/redis/redis.module");
const auth_module_1 = require("./auth/auth.module");
const merchants_module_1 = require("./merchants/merchants.module");
const users_module_1 = require("./users/users.module");
const locations_module_1 = require("./locations/locations.module");
const products_module_1 = require("./products/products.module");
const inventory_module_1 = require("./inventory/inventory.module");
const customers_module_1 = require("./customers/customers.module");
const orders_module_1 = require("./orders/orders.module");
const payments_module_1 = require("./payments/payments.module");
const refunds_module_1 = require("./refunds/refunds.module");
const subscriptions_module_1 = require("./subscriptions/subscriptions.module");
const reports_module_1 = require("./reports/reports.module");
const webhooks_module_1 = require("./webhooks/webhooks.module");
const admin_module_1 = require("./admin/admin.module");
const audit_module_1 = require("./audit/audit.module");
const notifications_module_1 = require("./notifications/notifications.module");
const employees_module_1 = require("./employees/employees.module");
const devices_module_1 = require("./devices/devices.module");
const registers_module_1 = require("./registers/registers.module");
const health_module_1 = require("./common/health/health.module");
const onboarding_module_1 = require("./onboarding/onboarding.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [app_config_1.default, database_config_1.default, jwt_config_1.default, stripe_config_1.default, redis_config_1.default],
                validate: env_validation_1.validate,
                expandVariables: true,
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'short',
                    ttl: 1000,
                    limit: 20,
                },
                {
                    name: 'medium',
                    ttl: 10000,
                    limit: 100,
                },
                {
                    name: 'long',
                    ttl: 60000,
                    limit: 300,
                },
            ]),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            merchants_module_1.MerchantsModule,
            users_module_1.UsersModule,
            locations_module_1.LocationsModule,
            products_module_1.ProductsModule,
            inventory_module_1.InventoryModule,
            customers_module_1.CustomersModule,
            orders_module_1.OrdersModule,
            payments_module_1.PaymentsModule,
            refunds_module_1.RefundsModule,
            subscriptions_module_1.SubscriptionsModule,
            reports_module_1.ReportsModule,
            webhooks_module_1.WebhooksModule,
            admin_module_1.AdminModule,
            audit_module_1.AuditModule,
            notifications_module_1.NotificationsModule,
            employees_module_1.EmployeesModule,
            devices_module_1.DevicesModule,
            registers_module_1.RegistersModule,
            onboarding_module_1.OnboardingModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map