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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let MerchantGuard = class MerchantGuard {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user)
            return false;
        if (user.role === client_1.UserRole.PLATFORM_ADMIN) {
            return true;
        }
        const merchantId = user.currentMerchantId || request.headers['x-merchant-id'];
        if (!merchantId) {
            throw new common_1.ForbiddenException('Merchant context required. Include X-Merchant-ID header.');
        }
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: merchantId, deletedAt: null },
        });
        if (!merchant) {
            throw new common_1.NotFoundException('Merchant not found');
        }
        const merchantUser = await this.prisma.merchantUser.findUnique({
            where: { merchantId_userId: { merchantId, userId: user.id } },
        });
        if (!merchantUser) {
            throw new common_1.ForbiddenException('You do not have access to this merchant');
        }
        request.merchant = merchant;
        return true;
    }
};
exports.MerchantGuard = MerchantGuard;
exports.MerchantGuard = MerchantGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MerchantGuard);
//# sourceMappingURL=merchant.guard.js.map