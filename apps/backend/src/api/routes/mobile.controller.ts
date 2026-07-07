import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Mobile')
@Controller('/mobile')
export class MobileController {
  @Get('/config')
  config() {
    const backendUrl =
      process.env.NEXT_PUBLIC_OVERRIDE_BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:3000';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const mobileAuthCallback =
      process.env.MOBILE_AUTH_CALLBACK_URL || 'postiz://auth/callback';
    const mobileIntegrationCallback =
      process.env.MOBILE_INTEGRATION_CALLBACK_URL ||
      'postiz://integrations/done';

    return {
      backendUrl,
      frontendUrl,
      mobileAuthCallback,
      mobileIntegrationCallback,
      features: {
        pushNotifications: true,
        mobileUploads: true,
        analytics: true,
      },
    };
  }
}
