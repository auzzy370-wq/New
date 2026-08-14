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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const subscriptions_service_1 = require("./subscriptions.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const merchant_guard_1 = require("../auth/guards/merchant.guard");
const merchant_decorator_1 = require("../common/decorators/merchant.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let SubscriptionsController = class SubscriptionsController {
    constructor(subscriptionsService) {
        this.subscriptionsService = subscriptionsService;
    }
    async getSubscription(merchantId) {
        return this.subscriptionsService.getSubscription(merchantId);
    }
    async create(merchantId, user, body) {
        return this.subscriptionsService.createSubscription(merchantId, {
            email: user.email,
            merchantName: body.merchantName,
            paymentMethodId: body.paymentMethodId,
        });
    }
    async createSetupIntent(merchantId) {
        return this.subscriptionsService.createSetupIntent(merchantId);
    }
    async cancel(merchantId) {
        return this.subscriptionsService.cancelSubscription(merchantId);
    }
    async reactivate(merchantId) {
        return this.subscriptionsService.reactivateSubscription(merchantId);
    }
    async getBillingPortal(merchantId) {
        return this.subscriptionsService.getBillingPortal(merchantId);
    }
    async getInvoices(merchantId) {
        return this.subscriptionsService.getInvoices(merchantId);
    }
    async getPaymentMethods(merchantId) {
        return this.subscriptionsService.getPaymentMethods(merchantId);
    }
    async updatePaymentMethod(merchantId, body) {
        return this.subscriptionsService.updatePaymentMethod(merchantId, body.paymentMethodId);
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current subscription' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getSubscription", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create $25/month subscription' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('setup-intent'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a Stripe SetupIntent for payment method collection' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "createSetupIntent", null);
__decorate([
    (0, common_1.Delete)(),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel subscription (at period end)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('reactivate'),
    (0, swagger_1.ApiOperation)({ summary: 'Reactivate a cancelled subscription' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "reactivate", null);
__decorate([
    (0, common_1.Post)('billing-portal'),
    (0, swagger_1.ApiOperation)({ summary: 'Get Stripe Billing Portal session URL' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getBillingPortal", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, swagger_1.ApiOperation)({ summary: 'Get billing invoices' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.Get)('payment-methods'),
    (0, swagger_1.ApiOperation)({ summary: 'Get saved payment methods' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getPaymentMethods", null);
__decorate([
    (0, common_1.Put)('payment-method'),
    (0, swagger_1.ApiOperation)({ summary: 'Update default payment method' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "updatePaymentMethod", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, swagger_1.ApiTags)('subscriptions'),
    (0, common_1.Controller)('subscriptions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, merchant_guard_1.MerchantGuard),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map