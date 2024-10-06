import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/api/routes/auth.controller';
import { AuthService } from '../../../src/services/auth/auth.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { UsersRepository } from '@gitroom/nestjs-libraries/database/prisma/users/users.repository';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { NotificationsRepository } from '@gitroom/nestjs-libraries/database/prisma/notifications/notifications.repository';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { PrismaRepository, PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService, UsersService, OrganizationService, NotificationService, EmailService, UsersRepository, OrganizationRepository, NotificationsRepository, PrismaRepository, PrismaService],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({transform: true}));  // Optional: for request validation
    await app.init();
  });

  afterAll(async () => {
    if (app != null) {
      await app.close();
    }
  });

  it('register a user', async () => {
    const createItemDto = { 
      email: 'nobody101@example.com',
      company: 'none',
      password: 'nothing',
      provider: 'LOCAL',
      providerToken: '',
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(createItemDto)
      .expect(JSON.stringify({
        register: true,
      }))
      .expect(HttpStatus.OK)
  });
});
