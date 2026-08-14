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
exports.MerchantsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const merchants_service_1 = require("./merchants.service");
const create_merchant_dto_1 = require("./dto/create-merchant.dto");
const update_merchant_dto_1 = require("./dto/update-merchant.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const config_1 = require("@nestjs/config");
let MerchantsController = class MerchantsController {
    constructor(merchantsService, configService) {
        this.merchantsService = merchantsService;
        this.configService = configService;
    }
    async create(user, dto) {
        return this.merchantsService.create(user.id, dto);
    }
    async getMyMerchants(user) {
        return this.merchantsService.getUserMerchants(user.id);
    }
    async findOne(id) {
        return this.merchantsService.findById(id);
    }
    async update(id, dto) {
        return this.merchantsService.update(id, dto);
    }
    async getOnboarding(id) {
        return this.merchantsService.getOnboardingStatus(id);
    }
    async initiateStripeOnboarding(id) {
        const frontendUrl = this.configService.get('app.frontendUrl');
        return this.merchantsService.initiateStripeOnboarding(id, frontendUrl);
    }
    async handleStripeReturn(id) {
        return this.merchantsService.handleStripeOnboardingReturn(id);
    }
    async getStripeDashboard(id) {
        return this.merchantsService.getStripeLoginLink(id);
    }
};
exports.MerchantsController = MerchantsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new merchant' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_merchant_dto_1.CreateMerchantDto]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all merchants for current user' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "getMyMerchants", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get merchant by ID' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update merchant information' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_merchant_dto_1.UpdateMerchantDto]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(':id/onboarding'),
    (0, swagger_1.ApiOperation)({ summary: 'Get merchant onboarding status' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "getOnboarding", null);
__decorate([
    (0, common_1.Post)(':id/stripe/onboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate Stripe Connect onboarding' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "initiateStripeOnboarding", null);
__decorate([
    (0, common_1.Get)(':id/stripe/return'),
    (0, swagger_1.ApiOperation)({ summary: 'Handle Stripe Connect onboarding return' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "handleStripeReturn", null);
__decorate([
    (0, common_1.Get)(':id/stripe/dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get Stripe Express dashboard link' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "getStripeDashboard", null);
exports.MerchantsController = MerchantsController = __decorate([
    (0, swagger_1.ApiTags)('merchants'),
    (0, common_1.Controller)('merchants'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    __metadata("design:paramtypes", [merchants_service_1.MerchantsService,
        config_1.ConfigService])
], MerchantsController);
//# sourceMappingURL=merchants.controller.js.map