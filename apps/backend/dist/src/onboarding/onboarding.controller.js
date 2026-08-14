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
exports.OnboardingController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const onboarding_service_1 = require("./onboarding.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const merchant_guard_1 = require("../auth/guards/merchant.guard");
const merchant_decorator_1 = require("../common/decorators/merchant.decorator");
const onboarding_dto_1 = require("./dto/onboarding.dto");
let OnboardingController = class OnboardingController {
    constructor(onboardingService) {
        this.onboardingService = onboardingService;
    }
    async getStatus(merchantId) {
        return this.onboardingService.getStatus(merchantId);
    }
    async updateBusinessInfo(merchantId, dto) {
        return this.onboardingService.updateBusinessInfo(merchantId, dto);
    }
    async updateBusinessType(merchantId, dto) {
        return this.onboardingService.updateBusinessType(merchantId, dto);
    }
    async updateBusinessAddress(merchantId, dto) {
        return this.onboardingService.updateBusinessAddress(merchantId, dto);
    }
    async updateOwnerInfo(merchantId, dto) {
        return this.onboardingService.updateOwnerInfo(merchantId, dto);
    }
    async initiateStripeConnect(merchantId) {
        return this.onboardingService.initiateStripeConnect(merchantId);
    }
    async handleStripeReturn(merchantIdFromQuery, merchantIdFromHeader) {
        const merchantId = merchantIdFromQuery || merchantIdFromHeader;
        return this.onboardingService.handleStripeConnectReturn(merchantId);
    }
    async createLocation(merchantId, dto) {
        return this.onboardingService.createOnboardingLocation(merchantId, dto);
    }
    async markTestTransactionComplete(merchantId) {
        return this.onboardingService.markTestTransactionComplete(merchantId);
    }
    async complete(merchantId) {
        return this.onboardingService.completeOnboarding(merchantId);
    }
    async getStatusByParam(merchantId) {
        return this.onboardingService.getStatus(merchantId);
    }
};
exports.OnboardingController = OnboardingController;
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get onboarding status and progress' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Put)('business-info'),
    (0, swagger_1.ApiOperation)({ summary: 'Step 2: Update business information' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, onboarding_dto_1.BusinessInfoDto]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "updateBusinessInfo", null);
__decorate([
    (0, common_1.Put)('business-type'),
    (0, swagger_1.ApiOperation)({ summary: 'Step 3: Update business type' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, onboarding_dto_1.BusinessTypeDto]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "updateBusinessType", null);
__decorate([
    (0, common_1.Put)('business-address'),
    (0, swagger_1.ApiOperation)({ summary: 'Step 4: Update business address' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, onboarding_dto_1.BusinessAddressDto]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "updateBusinessAddress", null);
__decorate([
    (0, common_1.Put)('owner-info'),
    (0, swagger_1.ApiOperation)({ summary: 'Step 5: Update owner information' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, onboarding_dto_1.OwnerInfoDto]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "updateOwnerInfo", null);
__decorate([
    (0, common_1.Post)('stripe/connect'),
    (0, swagger_1.ApiOperation)({ summary: 'Step 6: Initiate Stripe Connect onboarding' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "initiateStripeConnect", null);
__decorate([
    (0, common_1.Get)('stripe/return'),
    (0, swagger_1.ApiOperation)({ summary: 'Handle Stripe Connect onboarding return' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('merchantId')),
    __param(1, (0, merchant_decorator_1.MerchantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "handleStripeReturn", null);
__decorate([
    (0, common_1.Post)('location'),
    (0, swagger_1.ApiOperation)({ summary: 'Step 10: Create first location' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, onboarding_dto_1.CreateOnboardingLocationDto]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "createLocation", null);
__decorate([
    (0, common_1.Post)('test-transaction/complete'),
    (0, swagger_1.ApiOperation)({ summary: 'Step 14: Mark test transaction complete' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "markTestTransactionComplete", null);
__decorate([
    (0, common_1.Post)('complete'),
    (0, swagger_1.ApiOperation)({ summary: 'Step 15: Complete onboarding' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "complete", null);
__decorate([
    (0, common_1.Get)(':merchantId/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get onboarding status by merchant ID (path param)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "getStatusByParam", null);
exports.OnboardingController = OnboardingController = __decorate([
    (0, swagger_1.ApiTags)('onboarding'),
    (0, common_1.Controller)('onboarding'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, merchant_guard_1.MerchantGuard),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    __metadata("design:paramtypes", [onboarding_service_1.OnboardingService])
], OnboardingController);
//# sourceMappingURL=onboarding.controller.js.map