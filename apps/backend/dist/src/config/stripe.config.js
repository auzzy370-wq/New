"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('stripe', () => ({
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    subscriptionPriceId: process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
    platformFeeRate: parseFloat(process.env.STRIPE_PLATFORM_FEE_RATE || '0.01'),
}));
//# sourceMappingURL=stripe.config.js.map