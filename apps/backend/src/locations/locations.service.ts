import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from '../common/stripe/stripe.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async create(merchantId: string, dto: CreateLocationDto) {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
    });

    const locationCount = await this.prisma.location.count({ where: { merchantId } });

    let stripeLocationId: string | undefined;
    if (
      merchant.stripeAccountId &&
      dto.addressLine1 &&
      dto.city &&
      dto.state &&
      dto.postalCode
    ) {
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
        this.logger.warn(
          `Could not create Stripe Terminal location: ${(err as Error).message}`,
        );
      }
    }

    return this.prisma.location.create({
      data: {
        merchantId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country || 'US',
        timezone: dto.timezone || 'America/New_York',
        taxRate: dto.taxRatePercent !== undefined ? dto.taxRatePercent / 100 : 0,
        isDefault: locationCount === 0,
        stripeLocationId,
      },
    });
  }

  async findAll(merchantId: string) {
    return this.prisma.location.findMany({
      where: { merchantId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { orders: true, devices: true, employees: true },
        },
      },
    });
  }

  async findById(merchantId: string, id: string) {
    const location = await this.prisma.location.findFirst({
      where: { id, merchantId, deletedAt: null },
      include: {
        devices: { where: { status: { not: 'DECOMMISSIONED' } } },
        taxes: true,
        _count: { select: { orders: true } },
      },
    });

    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async update(merchantId: string, id: string, dto: UpdateLocationDto) {
    await this.findById(merchantId, id);

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.addressLine1 !== undefined) updateData.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) updateData.addressLine2 = dto.addressLine2;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.postalCode !== undefined) updateData.postalCode = dto.postalCode;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.taxRatePercent !== undefined) updateData.taxRate = dto.taxRatePercent / 100;

    return this.prisma.location.update({ where: { id }, data: updateData });
  }

  async delete(merchantId: string, id: string) {
    const location = await this.findById(merchantId, id);

    if (location.isDefault) {
      const otherLocations = await this.prisma.location.count({
        where: { merchantId, deletedAt: null, id: { not: id } },
      });
      if (otherLocations > 0) {
        throw new BadRequestException(
          'Cannot delete default location while other locations exist. Set another location as default first.',
        );
      }
    }

    return this.prisma.location.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async setDefault(merchantId: string, id: string) {
    await this.findById(merchantId, id);

    await this.prisma.location.updateMany({
      where: { merchantId },
      data: { isDefault: false },
    });

    return this.prisma.location.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async getConnectionToken(merchantId: string, locationId: string) {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
    });

    const location = await this.findById(merchantId, locationId);

    // If the merchant has a connected Stripe account, use it (production).
    // Otherwise fall back to the platform account so developers can test
    // in Stripe test mode without completing Connect onboarding first.
    const connectedAccountId = merchant.stripeAccountId || undefined;

    // Only pass a real Stripe location ID (skip demo placeholder)
    const stripeLocationId =
      location.stripeLocationId && location.stripeLocationId !== 'demo-location'
        ? location.stripeLocationId
        : undefined;

    return this.stripe.createTerminalConnectionToken(
      connectedAccountId,
      stripeLocationId,
    );
  }

  async getSummary(merchantId: string) {
    const locations = await this.findAll(merchantId);
    const defaultLocation = locations.find((l) => l.isDefault);

    return {
      total: locations.length,
      active: locations.filter((l) => l.isActive).length,
      defaultLocation: defaultLocation
        ? { id: defaultLocation.id, name: defaultLocation.name }
        : null,
      locations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        city: l.city,
        state: l.state,
        isDefault: l.isDefault,
        isActive: l.isActive,
        stripeConnected: !!l.stripeLocationId,
      })),
    };
  }
}
