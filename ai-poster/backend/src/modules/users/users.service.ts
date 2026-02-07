import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database.module';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatar: true, timezone: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; timezone?: string; avatar?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, avatar: true, timezone: true },
    });
  }

  async getTeamMembers(organizationId: string) {
    const members = await this.prisma.userOrganization.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, email: true, name: true, avatar: true, timezone: true } },
      },
    });
    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      disabled: m.disabled,
      user: m.user,
    }));
  }

  async inviteTeamMember(organizationId: string, email: string, role: 'ADMIN' | 'MEMBER') {
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email, name: email.split('@')[0], activated: false },
      });
    }

    const existing = await this.prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId } },
    });

    if (existing) throw new ConflictException('User already in organization');

    await this.prisma.userOrganization.create({
      data: { userId: user.id, organizationId, role },
    });

    return { success: true, userId: user.id };
  }

  async updateMemberRole(organizationId: string, userId: string, role: 'ADMIN' | 'MEMBER') {
    const membership = await this.prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new NotFoundException('Member not found');

    return this.prisma.userOrganization.update({
      where: { id: membership.id },
      data: { role },
    });
  }

  async removeMember(organizationId: string, userId: string) {
    const membership = await this.prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new NotFoundException('Member not found');

    await this.prisma.userOrganization.update({
      where: { id: membership.id },
      data: { disabled: true },
    });
    return { success: true };
  }
}
