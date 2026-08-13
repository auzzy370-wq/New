import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from '../common/stripe/stripe.service';
import { ConfigService } from '@nestjs/config';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { Merchant, MerchantStatus, UserRole } from '@prisma/client';
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly configService: ConfigService,
  ) {}

  async create(userId: string, dto: CreateMerchantDto): Promise<Merchant> {
    const baseSlug = createSlug(dto.name);
    const slug = await this.generateUniqueSlug(baseSlug);

    const merchant = await this.prisma.$transaction(async (tx) => {
      const m = await tx.merchant.create({
        data: {
          name: dto.name,
          slug,
          email: dto.email,
          phone: dto.phone,
          website: dto.website,
          businessType: dto.businessType,
          taxId: dto.taxId,
          currency: dto.currency || 'usd',
          timezone: dto.timezone || 'America/New_York',
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country || 'US',
          status: MerchantStatus.ONBOARDING,
          platformFeeRate: 0.01,
        },
      });

      await tx.merchantUser.create({
        data: {
          merchantId: m.id,
          userId,
          role: UserRole.MERCHANT_OWNER,
          isOwner: true,
          permissions: [],
        },
      });

      await tx.merchantSettings.create({
        data: {
          merchantId: m.id,
          tipPresets: [0.15, 0.18, 0.20, 0.25],
        },
      });

      return m;
    });

    this.logger.log(`Merchant created: ${merchant.name} (${merchant.id})`);
    return merchant;
  }

  async findById(id: string): Promise<Merchant> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id, deletedAt: null },
      include: {
        settings: true,
        locations: { where: { deletedAt: null } },
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return merchant;
  }

  async update(id: string, dto: UpdateMerchantDto): Promise<Merchant> {
    await this.findById(id);

    return this.prisma.merchant.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        businessType: dto.businessType,
        taxId: dto.taxId,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        timezone: dto.timezone,
        currency: dto.currency,
      },
    });
  }

  async getOnboardingStatus(id: string) {
    const merchant = await this.findById(id);
    const locations = await this.prisma.location.count({ where: { merchantId: id } });
    const products = await this.prisma.product.count({ where: { merchantId: id } });
    const hasSubscription = await this.prisma.subscription.findFirst({
      where: { merchantId: id },
    });

    return {
      merchant,
      onboardingStep: merchant.onboardingStep,
      onboardingCompleted: merchant.onboardingCompleted,
      checks: {
        merchantCreated: true,
        stripeConnected: merchant.stripeOnboardingComplete,
        subscriptionActive: !!hasSubscription,
        locationCreated: locations > 0,
        productsAdded: products > 0,
        tapToPayEnabled: !!merchant.stripePayoutsEnabled && !!merchant.stripeChargesEnabled,
      },
    };
  }

  async initiateStripeOnboarding(merchantId: string, frontendUrl: string) {
    const merchant = await this.findById(merchantId);

    let accountId = merchant.stripeAccountId;

    if (!accountId) {
      const account = await this.stripe.createConnectedAccount({
        email: merchant.email,
        businessType: merchant.businessType === 'individual' ? 'individual' : 'company',
        country: merchant.country,
        merchantId: merchant.id,
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

    return { url: onboardingLink.url };
  }

  async handleStripeOnboardingReturn(merchantId: string) {
    const merchant = await this.findById(merchantId);

    if (!merchant.stripeAccountId) {
      throw new BadRequestException('Stripe account not initialized');
    }

    const account = await this.stripe.retrieveAccount(merchant.stripeAccountId);

    const isComplete =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled;

    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        stripeAccountStatus: account.charges_enabled ? 'active' : 'pending',
        stripeOnboardingComplete: !!isComplete,
        stripePayoutsEnabled: !!account.payouts_enabled,
        stripeChargesEnabled: !!account.charges_enabled,
        status: isComplete ? MerchantStatus.ACTIVE : MerchantStatus.ONBOARDING,
        onboardingStep: isComplete ? Math.max(merchant.onboardingStep, 7) : merchant.onboardingStep,
      },
    });

    return {
      stripeAccountId: merchant.stripeAccountId,
      isComplete,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    };
  }

  async getStripeLoginLink(merchantId: string) {
    const merchant = await this.findById(merchantId);

    if (!merchant.stripeAccountId) {
      throw new BadRequestException('No Stripe account connected');
    }

    const loginLink = await this.stripe.createLoginLink(merchant.stripeAccountId);
    return { url: loginLink.url };
  }

  async updateOnboardingStep(merchantId: string, step: number) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { onboardingStep: step },
    });
  }

  async getUserMerchants(userId: string) {
    const merchantUsers = await this.prisma.merchantUser.findMany({
      where: { userId },
      include: {
        merchant: {
          include: {
            locations: { where: { deletedAt: null, isActive: true } },
          },
        },
      },
    });

    return merchantUsers
      .filter((mu) => !mu.merchant.deletedAt)
      .map((mu) => ({
        ...mu.merchant,
        role: mu.role,
        isOwner: mu.isOwner,
      }));
  }

  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.merchant.findUnique({ where: { slug } });
      if (!existing) return slug;
      slug = `${baseSlug}-${counter++}`;
    }
  }
}
