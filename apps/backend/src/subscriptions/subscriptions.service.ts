import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
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

  async createSubscription(
    merchantId: string,
    params: {
      email: string;
      merchantName: string;
      paymentMethodId?: string;
    },
  ) {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      include: { subscriptions: true },
    });

    const existing = merchant.subscriptions.find(
      (s) =>
        s.status === SubscriptionStatus.ACTIVE ||
        s.status === SubscriptionStatus.TRIALING,
    );
    if (existing) {
      throw new BadRequestException('Merchant already has an active subscription');
    }

    // Reuse or create a Stripe customer
    let stripeCustomerId = merchant.subscriptions[0]?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.createStripeCustomer({
        email: params.email,
        name: params.merchantName,
        metadata: { merchantId },
      });
      stripeCustomerId = customer.id;
    }

    const priceId = this.configService.get<string>('stripe.subscriptionPriceId')!;
    const idempotencyKey = `sub-${merchantId}-${uuidv4()}`;

    let stripeSubscription;
    if (params.paymentMethodId) {
      await this.stripe.attachPaymentMethod(params.paymentMethodId, stripeCustomerId);
      await this.stripe.setDefaultPaymentMethod(stripeCustomerId, params.paymentMethodId);

      stripeSubscription = await this.stripe.createSubscriptionWithPaymentMethod({
        customerId: stripeCustomerId,
        priceId,
        paymentMethodId: params.paymentMethodId,
        trialPeriodDays: 14,
        idempotencyKey,
        metadata: { merchantId },
      });
    } else {
      stripeSubscription = await this.stripe.createSubscription({
        customerId: stripeCustomerId,
        priceId,
        trialPeriodDays: 14,
        idempotencyKey,
        metadata: { merchantId },
      });
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        merchantId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId,
        stripePriceId: priceId,
        status: SubscriptionStatus.TRIALING,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialStart: stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000)
          : null,
        trialEnd: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : null,
        amount: 2500,
        currency: 'usd',
      },
    });

    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        subscriptionStatus: SubscriptionStatus.TRIALING,
        subscriptionCurrentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000,
        ),
        trialEndsAt: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : null,
        onboardingStep: 10,
      },
    });

    this.logger.log(`Subscription created for merchant ${merchantId}`);
    return subscription;
  }

  async createSetupIntent(merchantId: string) {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    let stripeCustomerId = merchant.subscriptions[0]?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await this.stripe.createStripeCustomer({
        email: merchant.email || '',
        name: merchant.name,
        metadata: { merchantId },
      });
      stripeCustomerId = customer.id;
    }

    const setupIntent = await this.stripe.createSetupIntent({
      customerId: stripeCustomerId,
      idempotencyKey: `setup-${merchantId}-${uuidv4()}`,
    });

    return {
      clientSecret: setupIntent.client_secret,
      stripeCustomerId,
    };
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

  async reactivateSubscription(merchantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        merchantId,
        status: { in: [SubscriptionStatus.CANCELLED, SubscriptionStatus.PAST_DUE] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new NotFoundException('No cancelled subscription found');
    }

    try {
      const reactivated = await this.stripe.resumeSubscription(
        subscription.stripeSubscriptionId,
      );

      return this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          cancelledAt: null,
          currentPeriodStart: new Date(reactivated.current_period_start * 1000),
          currentPeriodEnd: new Date(reactivated.current_period_end * 1000),
        },
      });
    } catch {
      // Subscription may have expired — create a new one
      const merchant = await this.prisma.merchant.findUniqueOrThrow({
        where: { id: merchantId },
      });

      return this.createSubscription(merchantId, {
        email: merchant.email || '',
        merchantName: merchant.name,
      });
    }
  }

  async getBillingPortal(merchantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription?.stripeCustomerId) {
      throw new NotFoundException('No billing record found');
    }

    const frontendUrl = this.configService.get<string>('app.frontendUrl')!;

    const session = await this.stripe.createBillingPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${frontendUrl}/dashboard/billing`,
    });

    return { url: session.url };
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

  async getPaymentMethods(merchantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription?.stripeCustomerId) return [];

    return this.stripe.listPaymentMethods(subscription.stripeCustomerId);
  }

  async updatePaymentMethod(merchantId: string, paymentMethodId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        merchantId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription?.stripeSubscriptionId || !subscription?.stripeCustomerId) {
      throw new NotFoundException('No active subscription found');
    }

    await this.stripe.attachPaymentMethod(paymentMethodId, subscription.stripeCustomerId);
    await this.stripe.setDefaultPaymentMethod(subscription.stripeCustomerId, paymentMethodId);
    await this.stripe.updateSubscriptionPaymentMethod(
      subscription.stripeSubscriptionId,
      paymentMethodId,
    );

    return { success: true };
  }
}
