import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '@gitroom/backend/services/auth/auth.service';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { Response } from 'express';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';

describe('AuthController - register', () => {
  let controller: AuthController;
  let authService: AuthService;
  let emailService: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            getOrgFromCookie: jest.fn(),
            routeAuth: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            hasProvider: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    emailService = module.get<EmailService>(EmailService);
  });

  it('should activate user if provider is LOCAL and email service is available', async () => {
    const mockBody: CreateOrgUserDto = {
      provider: 'LOCAL',
      email: 'test@example.com',
      password: 'password123',
      providerToken: null,
      company: 'Test Company',
    };
    const response = {
      header: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
    } as unknown as Response;

    jest.spyOn(authService, 'getOrgFromCookie').mockReturnValue(null);
    jest.spyOn(authService, 'routeAuth').mockResolvedValue({
      jwt: 'mockJwt',
      addedOrg: false,
    });
    jest.spyOn(emailService, 'hasProvider').mockReturnValue(true);

    await controller.register(
      { cookies: {} } as any,
      mockBody,
      response,
      '127.0.0.1',
      'Mozilla/5.0'
    );

    expect(response.header).toHaveBeenCalledWith('activate', 'true');
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ activate: true });
  });

  it('should register user without activation if provider is not LOCAL', async () => {
    const mockBody: CreateOrgUserDto = {
      provider: 'GOOGLE',
      email: 'test@example.com',
      password: 'password123',
      providerToken: 'googleToken123',
      company: 'Test Company',
    };
    const response = {
      header: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
    } as unknown as Response;

    jest.spyOn(authService, 'getOrgFromCookie').mockReturnValue(null);
    jest.spyOn(authService, 'routeAuth').mockResolvedValue({
      jwt: 'mockJwt',
      addedOrg: false,
    });
    jest.spyOn(emailService, 'hasProvider').mockReturnValue(false);

    await controller.register(
      { cookies: {} } as any,
      mockBody,
      response,
      '127.0.0.1',
      'Mozilla/5.0'
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'auth',
      'mockJwt',
      expect.objectContaining({ httpOnly: true })
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ register: true });
  });

  it('should handle addedOrg and set showorg cookie if applicable', async () => {
    const mockBody: CreateOrgUserDto = {
      provider: 'GOOGLE',
      email: 'test@example.com',
      password: 'password123',
      providerToken: 'googleToken123',
      company: 'Test Company',
    };
    const response = {
      header: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
    } as unknown as Response;

    jest.spyOn(authService, 'getOrgFromCookie').mockReturnValue(null);
    jest.spyOn(authService, 'routeAuth').mockResolvedValue({
      jwt: 'mockJwt',
      addedOrg: {
        id: 'orgId123',
        createdAt: new Date(),
        updatedAt: new Date(),
        disabled: false,
        role: 'ADMIN',
        userId: 'userId123',
        organizationId: 'orgId123',
      },
    });
    jest.spyOn(emailService, 'hasProvider').mockReturnValue(false);

    await controller.register(
      { cookies: {} } as any,
      mockBody,
      response,
      '127.0.0.1',
      'Mozilla/5.0'
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'showorg',
      'orgId123',
      expect.objectContaining({ httpOnly: true })
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ register: true });
  });

  it('should return 400 if an exception occurs', async () => {
    const mockBody: CreateOrgUserDto = {
      provider: 'LOCAL',
      email: 'test@example.com',
      password: 'password123',
      providerToken: null,
      company: 'Test Company',
    };
    const response = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    jest.spyOn(authService, 'getOrgFromCookie').mockImplementation(() => {
      throw new Error('Test error');
    });

    await controller.register(
      { cookies: {} } as any,
      mockBody,
      response,
      '127.0.0.1',
      'Mozilla/5.0'
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.send).toHaveBeenCalledWith('Test error');
  });
});