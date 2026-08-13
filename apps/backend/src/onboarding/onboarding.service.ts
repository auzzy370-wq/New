import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from '../common/stripe/stripe.service';
import { ConfigService } from '@nestjs/config';
import { MerchantStatus, SubscriptionStatus } from '@prisma/client';
import {
  OnboardingStep,
  BusinessInfoDto,
  BusinessTypeDto,
  BusinessAddressDto,
  OwnerInfoDto,
  CreateOnboardingLocationDto,
} from './dto/onboarding.dto';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly configService: ConfigService,
  ) {}

  async getStatus(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId, deletedAt: null },
      include: {
        settings: true,
        locations: { where: { deletedAt: null }, take: 1 },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!merchant) throw new NotFoundException('Merchant not found');

    const locationCount = await this.prisma.location.count({ where: { merchantId } });
    const productCount = await this.prisma.product.count({ where: { merchantId } });
    const deviceCount = await this.prisma.device.count({ where: { merchantId } });

    const activeSubscription = merchant.subscriptions.find(
      (s) => s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.TRIALING,
    );

    const steps = {
      [OnboardingStep.ACCOUNT_CREATED]: true,
      [OnboardingStep.BUSINESS_INFO]: !!(merchant.name && merchant.email),
      [OnboardingStep.BUSINESS_TYPE]: !!merchant.businessType,
      [OnboardingStep.BUSINESS_ADDRESS]: !!(merchant.city && merchant.postalCode),
      [OnboardingStep.OWNER_INFO]: !!(merchant.settings?.ownerFirstName || merchant.settings?.ownerLastName),
      [OnboardingStep.STRIPE_ONBOARDING]: !!merchant.stripeAccountId,
      [OnboardingStep.KYC_KYB]: !!merchant.stripeOnboardingComplete,
      [OnboardingStep.BANK_SETUP]: !!merchant.stripePayoutsEnabled,
      [OnboardingStep.SUBSCRIPTION]: !!activeSubscription,
      [OnboardingStep.LOCATION]: locationCount > 0,
      [OnboardingStep.PRODUCTS]: productCount > 0,
      [OnboardingStep.DEVICE]: deviceCount > 0,
      [OnboardingStep.TAP_TO_PAY]: !!(merchant.stripeChargesEnabled && deviceCount > 0),
      [OnboardingStep.TEST_TRANSACTION]: merchant.onboardingStep >= OnboardingStep.TEST_TRANSACTION,
      [OnboardingStep.COMPLETE]: merchant.onboardingCompleted,
    };

    const completedSteps = Object.entries(steps)
      .filter(([, done]) => done)
      .map(([step]) => Number(step));

    const currentStep = merchant.onboardingStep || OnboardingStep.ACCOUNT_CREATED;
    const nextStep = this.getNextIncompleteStep(steps, currentStep);

    return {
      merchantId,
      currentStep,
      nextStep,
      completedSteps,
      onboardingCompleted: merchant.onboardingCompleted,
      steps,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        status: merchant.status,
        stripeAccountId: merchant.stripeAccountId,
        stripeOnboardingComplete: merchant.stripeOnboardingComplete,
        stripeChargesEnabled: merchant.stripeChargesEnabled,
        stripePayoutsEnabled: merchant.stripePayoutsEnabled,
        subscriptionStatus: merchant.subscriptionStatus,
      },
    };
  }

  private getNextIncompleteStep(
    steps: Record<number, boolean>,
    currentStep: number,
  ): number {
    for (let s = currentStep; s <= OnboardingStep.COMPLETE; s++) {
      if (!steps[s]) return s;
    }
    return OnboardingStep.COMPLETE;
  }

  async updateBusinessInfo(merchantId: string, dto: BusinessInfoDto) {
    const merchant = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        onboardingStep: { set: Math.max(OnboardingStep.BUSINESS_INFO, 0) },
      },
    });

    await this.advanceStep(merchantId, OnboardingStep.BUSINESS_INFO);
    return merchant;
  }

  async updateBusinessType(merchantId: string, dto: BusinessTypeDto) {
    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        businessType: dto.businessType,
        taxId: dto.taxId,
      },
    });

    await this.advanceStep(merchantId, OnboardingStep.BUSINESS_TYPE);
    return this.getStatus(merchantId);
  }

  async updateBusinessAddress(merchantId: string, dto: BusinessAddressDto) {
    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country || 'US',
        timezone: dto.timezone || 'America/New_York',
      },
    });

    await this.advanceStep(merchantId, OnboardingStep.BUSINESS_ADDRESS);
    return this.getStatus(merchantId);
  }

  async updateOwnerInfo(merchantId: string, dto: OwnerInfoDto) {
    await this.prisma.merchantSettings.upsert({
      where: { merchantId },
      create: {
        merchantId,
        ownerFirstName: dto.firstName,
        ownerLastName: dto.lastName,
        ownerPhone: dto.phone,
        ownerTitle: dto.title,
        tipPresets: [0.15, 0.18, 0.2, 0.25],
      },
      update: {
        ownerFirstName: dto.firstName,
        ownerLastName: dto.lastName,
        ownerPhone: dto.phone,
        ownerTitle: dto.title,
      },
    });

    await this.advanceStep(merchantId, OnboardingStep.OWNER_INFO);
    return this.getStatus(merchantId);
  }

  async initiateStripeConnect(merchantId: string) {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
    });

    const frontendUrl = this.configService.get<string>('app.frontendUrl')!;

    let accountId = merchant.stripeAccountId;

    if (!accountId) {
      const account = await this.stripe.createConnectedAccount({
        email: merchant.email || '',
        businessType:
          merchant.businessType === 'individual' ? 'individual' : 'company',
        country: merchant.country || 'US',
        merchantId,
      });

      accountId = account.id;

      await this.prisma.merchant.update({
        where: { id: merchantId },
        data: { stripeAccountId: accountId },
      });
    }

    const onboardingLink = await this.stripe.createAccountOnboardingLink(accountId, {
      returnUrl: `${frontendUrl}/onboarding/stripe/return?merchantId=${merchantId}`,
      refreshUrl: `${frontendUrl}/onboarding/stripe/refresh?merchantId=${merchantId}`,
    });

    await this.advanceStep(merchantId, OnboardingStep.STRIPE_ONBOARDING);

    return { url: onboardingLink.url, accountId };
  }

  async handleStripeConnectReturn(merchantId: string) {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
    });

    if (!merchant.stripeAccountId) {
      throw new BadRequestException('Stripe account not initialized');
    }

    const account = await this.stripe.retrieveAccount(merchant.stripeAccountId);

    const isComplete =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled;

    const updateData: Record<string, unknown> = {
      stripeAccountStatus: account.charges_enabled ? 'active' : 'pending',
      stripeOnboardingComplete: !!isComplete,
      stripePayoutsEnabled: !!account.payouts_enabled,
      stripeChargesEnabled: !!account.charges_enabled,
    };

    if (isComplete) {
      updateData.status = MerchantStatus.ACTIVE;
    }

    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: updateData,
    });

    if (account.payouts_enabled) {
      await this.advanceStep(merchantId, OnboardingStep.BANK_SETUP);
    } else if (account.charges_enabled) {
      await this.advanceStep(merchantId, OnboardingStep.KYC_KYB);
    }

    return {
      stripeAccountId: merchant.stripeAccountId,
      isComplete,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  }

  async createOnboardingLocation(merchantId: string, dto: CreateOnboardingLocationDto) {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
    });

    const locationCount = await this.prisma.location.count({ where: { merchantId } });

    let stripeLocationId: string | undefined;
    if (merchant.stripeAccountId && dto.addressLine1 && dto.city && dto.state && dto.postalCode) {
      try {
        const stripeLocation = await this.stripe.createTerminalLocation({
          displayName: dto.name,
          address: {
            line1: dto.addressLine1,
            city: dto.city,
            state: dto.state,
            postalCode: dto.postalCode,
            country: dto.country || 'US',
          },
          connectedAccountId: merchant.stripeAccountId,
        });
        stripeLocationId = stripeLocation.id;
      } catch (err) {
        this.logger.warn(`Failed to create Stripe Terminal location: ${(err as Error).message}`);
      }
    }

    const location = await this.prisma.location.create({
      data: {
        merchantId,
        name: dto.name,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country || 'US',
        timezone: dto.timezone || 'America/New_York',
        phone: dto.phone,
        email: dto.email,
        taxRate: dto.defaultTaxRate ? dto.defaultTaxRate / 100 : 0,
        isDefault: locationCount === 0,
        stripeLocationId,
      },
    });

    await this.advanceStep(merchantId, OnboardingStep.LOCATION);
    return location;
  }

  async markTestTransactionComplete(merchantId: string) {
    await this.advanceStep(merchantId, OnboardingStep.TEST_TRANSACTION);
    return this.getStatus(merchantId);
  }

  async completeOnboarding(merchantId: string) {
    const status = await this.getStatus(merchantId);

    const requiredSteps = [
      OnboardingStep.BUSINESS_INFO,
      OnboardingStep.STRIPE_ONBOARDING,
      OnboardingStep.SUBSCRIPTION,
      OnboardingStep.LOCATION,
    ];

    const missingRequired = requiredSteps.filter((s) => !status.steps[s]);
    if (missingRequired.length > 0) {
      throw new BadRequestException(
        `Cannot complete onboarding. Missing required steps: ${missingRequired.join(', ')}`,
      );
    }

    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        onboardingCompleted: true,
        onboardingStep: OnboardingStep.COMPLETE,
        status: MerchantStatus.ACTIVE,
      },
    });

    this.logger.log(`Onboarding completed for merchant ${merchantId}`);
    return this.getStatus(merchantId);
  }

  private async advanceStep(merchantId: string, completedStep: number) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { onboardingStep: true },
    });

    if (!merchant) return;

    const nextStep = completedStep + 1;
    if (nextStep > merchant.onboardingStep) {
      await this.prisma.merchant.update({
        where: { id: merchantId },
        data: { onboardingStep: nextStep },
      });
    }
  }
}
