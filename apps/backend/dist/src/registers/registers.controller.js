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
exports.RegistersController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const registers_service_1 = require("./registers.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const merchant_decorator_1 = require("../common/decorators/merchant.decorator");
let RegistersController = class RegistersController {
    constructor(registersService) {
        this.registersService = registersService;
    }
    async open(merchantId, body) {
        return this.registersService.openSession(merchantId, body);
    }
    async close(merchantId, id, body) {
        return this.registersService.closeSession(merchantId, id, body);
    }
    async getCurrent(merchantId, locationId) {
        return this.registersService.getCurrentSession(merchantId, locationId);
    }
    async getSessions(merchantId, locationId) {
        return this.registersService.getSessions(merchantId, locationId);
    }
};
exports.RegistersController = RegistersController;
__decorate([
    (0, common_1.Post)('open'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RegistersController.prototype, "open", null);
__decorate([
    (0, common_1.Post)(':id/close'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RegistersController.prototype, "close", null);
__decorate([
    (0, common_1.Get)('current'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Query)('locationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RegistersController.prototype, "getCurrent", null);
__decorate([
    (0, common_1.Get)(),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, merchant_decorator_1.MerchantId)()),
    __param(1, (0, common_1.Query)('locationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RegistersController.prototype, "getSessions", null);
exports.RegistersController = RegistersController = __decorate([
    (0, swagger_1.ApiTags)('registers'),
    (0, common_1.Controller)('registers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    __metadata("design:paramtypes", [registers_service_1.RegistersService])
], RegistersController);
//# sourceMappingURL=registers.controller.js.map