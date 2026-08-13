import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from '../common/stripe/stripe.service';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly configService: ConfigService,
  ) {}

  async createSubscription(merchantId: string, params: {
    email: string;
    merchantName: string;
    paymentMethodId?: string;
  }) {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      include: { subscriptions: true },
    });

    // Check for existing active subscription
    const existing = merchant.subscriptions.find(
      (s) => s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.TRIALING,
    );
    if (existing) {
      throw new BadRequestException('Merchant already has an active subscription');
    }

    // Create Stripe customer
    const stripeCustomer = await this.stripe.createStripeCustomer({
      email: params.email,
      name: params.merchantName,
      metadata: { merchantId },
    });

    const priceId = this.configService.get<string>('stripe.subscriptionPriceId')!;

    const stripeSubscription = await this.stripe.createSubscription({
      customerId: stripeCustomer.id,
      priceId,
      trialPeriodDays: 14,
      idempotencyKey: `sub-${merchantId}-${uuidv4()}`,
      metadata: { merchantId },
    });

    const subscription = await this.prisma.subscription.create({
      data: {
        merchantId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: stripeCustomer.id,
        stripePriceId: priceId,
        status: SubscriptionStatus.TRIALING,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
        amount: 2500,
        currency: 'usd',
      },
    });

    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        subscriptionStatus: SubscriptionStatus.TRIALING,
        subscriptionCurrentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialEndsAt: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      },
    });

    return subscription;
  }

  async cancelSubscription(merchantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        merchantId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription found');
    }

    await this.stripe.cancelSubscription(subscription.stripeSubscriptionId);

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
    });
  }

  async getSubscription(merchantId: string) {
    return this.prisma.subscription.findFirst({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      include: { invoices: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
  }

  async getInvoices(merchantId: string) {
    return this.prisma.invoice.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
