import { registerAs } from '@nestjs/config';

export default registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  subscriptionPriceId: process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
  platformFeeRate: parseFloat(process.env.STRIPE_PLATFORM_FEE_RATE || '0.01'),
}));
