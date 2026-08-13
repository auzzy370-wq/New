import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from '../common/stripe/stripe.service';
import { DeviceType, DeviceStatus } from '@prisma/client';

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async register(merchantId: string, data: {
    name: string;
    type: DeviceType;
    locationId?: string;
    serialNumber?: string;
    stripeReaderId?: string;
  }) {
    return this.prisma.device.create({ data: { merchantId, ...data, status: DeviceStatus.ACTIVE } });
  }

  async findAll(merchantId: string, locationId?: string) {
    return this.prisma.device.findMany({
      where: { merchantId, ...(locationId && { locationId }), status: { not: DeviceStatus.DECOMMISSIONED } },
      include: { location: { select: { name: true } } },
    });
  }

  async updateLastSeen(merchantId: string, deviceId: string) {
    return this.prisma.device.updateMany({
      where: { id: deviceId, merchantId },
      data: { lastSeenAt: new Date() },
    });
  }

  async getConnectionToken(merchantId: string, locationId: string) {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });
    const location = await this.prisma.location.findFirst({ where: { id: locationId, merchantId } });

    if (!merchant.stripeAccountId) throw new NotFoundException('No Stripe account');

    return this.stripe.createTerminalConnectionToken(
      merchant.stripeAccountId,
      location?.stripeLocationId || undefined,
    );
  }
}
