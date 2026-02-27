import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

/**
 * Public controller for GET /copilot/features only.
 * Used by the frontend during SSR (layout) without auth, so it must not require authentication.
 */
@Controller('/copilot')
export class CopilotFeaturesController {
  @Get('/features')
  getFeatures(@Res() res: Response) {
    const chatEnabled =
      !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';
    const mcpDisabled =
      process.env.DISABLE_MCP === '1' ||
      process.env.DISABLE_MCP === 'true' ||
      process.env.DISABLE_MCP === 'yes';
    return res.json({
      chatEnabled,
      mcpEnabled: !mcpDisabled,
    });
  }
}
