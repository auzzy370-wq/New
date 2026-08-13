import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from '../common/stripe/stripe.service';

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async create(merchantId: string, data: {
    name: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    timezone?: string;
    phone?: string;
    email?: string;
  }) {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });
    const locationCount = await this.prisma.location.count({ where: { merchantId } });

    // Create Stripe Terminal location if merchant has Stripe account
    let stripeLocationId: string | undefined;
    if (merchant.stripeAccountId && data.addressLine1 && data.city && data.state && data.postalCode) {
      try {
        const stripeLocation = await this.stripe.createTerminalLocation({
          displayName: data.name,
          address: {
            line1: data.addressLine1,
            city: data.city,
            state: data.state,
            postalCode: data.postalCode,
            country: data.country || 'US',
          },
          connectedAccountId: merchant.stripeAccountId,
        });
        stripeLocationId = stripeLocation.id;
      } catch {
        // Non-fatal: location can be created without Stripe
      }
    }

    return this.prisma.location.create({
      data: {
        merchantId,
        name: data.name,
        addressLine1: data.addressLine1,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country || 'US',
        timezone: data.timezone || 'America/New_York',
        phone: data.phone,
        email: data.email,
        isDefault: locationCount === 0,
        stripeLocationId,
      },
    });
  }

  async findAll(merchantId: string) {
    return this.prisma.location.findMany({
      where: { merchantId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findById(merchantId: string, id: string) {
    const location = await this.prisma.location.findFirst({
      where: { id, merchantId, deletedAt: null },
    });
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async update(merchantId: string, id: string, data: Partial<{
    name: string; addressLine1: string; city: string; state: string;
    postalCode: string; country: string; timezone: string; phone: string; email: string;
  }>) {
    await this.findById(merchantId, id);
    return this.prisma.location.update({ where: { id }, data });
  }

  async getConnectionToken(merchantId: string, locationId: string) {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });
    if (!merchant.stripeAccountId) throw new NotFoundException('No Stripe account');

    const location = await this.findById(merchantId, locationId);
    return this.stripe.createTerminalConnectionToken(
      merchant.stripeAccountId,
      location.stripeLocationId || undefined,
    );
  }
}
