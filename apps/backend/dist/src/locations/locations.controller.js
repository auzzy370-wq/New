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
exports.LocationsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const locations_service_1 = require("./locations.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const merchant_guard_1 = require("../auth/guards/merchant.guard");
const merchant_decorator_1 = require("../common/decorators/merchant.decorator");
const location_dto_1 = require("./dto/location.dto");
let LocationsController = class LocationsController {
    constructor(locationsService) {
        this.locationsService = locationsService;
    }
    async findAll(merchantId) {
        return this.locationsService.findAll(merchantId);
    }
    async getSummary(merchantId) {
        return this.locationsService.getSummary(merchantId);
    }
    async create(merchantId, dto) {
        return this.locationsService.create(merchantId, dto);
    }
    async findOne(merchantId, id) {
        return this.locationsService.findById(merchantId, id);
    }
    async update(merchantId, id, dto) {
        return this.locationsService.update(merchantId, id, dto);
    }
    async delete(merchantId, id) {
        return this.locationsService.delete(merchantId, id);
    }
    async setDefault(merchantId, id) {
        return this.locationsService.setDefault(merchantId, id);
    }
    async getConnectionToken(merchantId, id) {
        return this.locationsService.getConnectionToken(merchantId, id);
    }
};
exports.LocationsController = LocationsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all locations for merchant' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Get locations summary' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new location' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, location_dto_1.CreateLocationDto]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get location by ID' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update location' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, location_dto_1.UpdateLocationDto]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete (soft) location' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "delete", null);
__decorate([
    (0, common_1.Put)(':id/default'),
    (0, swagger_1.ApiOperation)({ summary: 'Set location as default' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "setDefault", null);
__decorate([
    (0, common_1.Post)(':id/connection-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Get Stripe Terminal connection token for location' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "getConnectionToken", null);
exports.LocationsController = LocationsController = __decorate([
    (0, swagger_1.ApiTags)('locations'),
    (0, common_1.Controller)('locations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, merchant_guard_1.MerchantGuard),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    __metadata("design:paramtypes", [locations_service_1.LocationsService])
], LocationsController);
//# sourceMappingURL=locations.controller.js.map