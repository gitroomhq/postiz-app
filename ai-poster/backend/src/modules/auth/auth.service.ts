import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database.module';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: {
    email: string;
    password: string;
    name: string;
    organizationName: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
      },
    });

    const organization = await this.prisma.organization.create({
      data: { name: data.organizationName },
    });

    await this.prisma.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'ADMIN',
      },
    });

    const token = this.generateToken(user.id, organization.id);

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, timezone: user.timezone },
      organization: { id: organization.id, name: organization.name },
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organizations: {
          include: { organization: true },
          where: { disabled: false },
          take: 1,
        },
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const org = user.organizations[0];
    if (!org) {
      throw new UnauthorizedException('No organization found');
    }

    const token = this.generateToken(user.id, org.organizationId);

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, timezone: user.timezone },
      organization: { id: org.organization.id, name: org.organization.name },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: { organization: true },
          where: { disabled: false },
        },
      },
    });

    if (!user) throw new UnauthorizedException();

    const org = user.organizations[0];
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        timezone: user.timezone,
      },
      organization: org
        ? { id: org.organization.id, name: org.organization.name }
        : null,
    };
  }

  private generateToken(userId: string, organizationId: string): string {
    return this.jwtService.sign({ sub: userId, orgId: organizationId });
  }
}
