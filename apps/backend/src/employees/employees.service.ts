import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(merchantId: string, data: {
    firstName: string; lastName: string; email?: string; phone?: string;
    pin?: string; role?: UserRole; permissions?: string[]; locationIds?: string[];
  }, actorUserId?: string) {
    const pinHash = data.pin ? await argon2.hash(data.pin) : undefined;

    const employee = await this.prisma.employee.create({
      data: {
        merchantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        pin: pinHash,
        role: data.role || UserRole.MERCHANT_CASHIER,
        permissions: data.permissions || [],
        locations: data.locationIds
          ? { create: data.locationIds.map((locationId) => ({ locationId })) }
          : undefined,
      },
    });

    await this.audit.log({
      merchantId,
      userId: actorUserId,
      action: AuditAction.EMPLOYEE_CREATE,
      resource: 'employee',
      resourceId: employee.id,
      after: { name: `${employee.firstName} ${employee.lastName}`, role: employee.role },
    });

    return employee;
  }

  async findAll(merchantId: string) {
    return this.prisma.employee.findMany({
      where: { merchantId, deletedAt: null },
      include: { locations: { include: { location: { select: { name: true } } } } },
      orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }],
    });
  }

  async findById(merchantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, merchantId, deletedAt: null },
      include: { locations: { include: { location: true } } },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    const { pin, ...safe } = employee;
    void pin;
    return safe;
  }

  async update(merchantId: string, id: string, data: Partial<{
    firstName: string; lastName: string; email: string; phone: string;
    role: UserRole; permissions: string[]; isActive: boolean;
  }>, actorUserId?: string) {
    const before = await this.findById(merchantId, id);
    const updated = await this.prisma.employee.update({ where: { id }, data });

    await this.audit.log({
      merchantId,
      userId: actorUserId,
      action: AuditAction.EMPLOYEE_UPDATE,
      resource: 'employee',
      resourceId: id,
      before: before as Record<string, unknown>,
      after: data as Record<string, unknown>,
    });

    return updated;
  }

  async validatePin(merchantId: string, employeeId: string, pin: string): Promise<boolean> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, merchantId },
    });
    if (!employee?.pin) return false;
    return argon2.verify(employee.pin, pin);
  }
}
