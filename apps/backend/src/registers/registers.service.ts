import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterSessionStatus } from '@prisma/client';

@Injectable()
export class RegistersService {
  constructor(private readonly prisma: PrismaService) {}

  async openSession(merchantId: string, data: {
    locationId: string;
    employeeId?: string;
    openingCashAmount: number;
    notes?: string;
  }) {
    // Check for open sessions at this location
    const existing = await this.prisma.registerSession.findFirst({
      where: { merchantId, locationId: data.locationId, status: RegisterSessionStatus.OPEN },
    });

    if (existing) {
      throw new BadRequestException('A register session is already open at this location');
    }

    return this.prisma.registerSession.create({
      data: { merchantId, ...data },
    });
  }

  async closeSession(merchantId: string, sessionId: string, data: {
    actualCashAmount: number;
    notes?: string;
  }) {
    const session = await this.prisma.registerSession.findFirst({
      where: { id: sessionId, merchantId, status: RegisterSessionStatus.OPEN },
    });

    if (!session) throw new NotFoundException('Open register session not found');

    const cashDifference = data.actualCashAmount - session.expectedCashAmount;

    return this.prisma.registerSession.update({
      where: { id: sessionId },
      data: {
        status: RegisterSessionStatus.CLOSED,
        actualCashAmount: data.actualCashAmount,
        cashDifference,
        closedAt: new Date(),
        notes: data.notes,
      },
    });
  }

  async getCurrentSession(merchantId: string, locationId: string) {
    return this.prisma.registerSession.findFirst({
      where: { merchantId, locationId, status: RegisterSessionStatus.OPEN },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });
  }

  async getSessions(merchantId: string, locationId?: string) {
    return this.prisma.registerSession.findMany({
      where: { merchantId, ...(locationId && { locationId }) },
      orderBy: { openedAt: 'desc' },
      take: 50,
      include: {
        location: { select: { name: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
    });
  }
}
