"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantId = exports.CurrentMerchant = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentMerchant = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.merchant;
});
exports.MerchantId = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.merchant?.id || request.user?.currentMerchantId;
});
//# sourceMappingURL=merchant.decorator.js.map