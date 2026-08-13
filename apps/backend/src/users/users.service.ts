import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: { merchantUsers: { include: { merchant: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, mfaSecret, mfaBackupCodes, ...safe } = user;
    void passwordHash; void mfaSecret; void mfaBackupCodes;
    return safe;
  }

  async updateProfile(id: string, data: { firstName?: string; lastName?: string; phone?: string; timezone?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
