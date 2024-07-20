import { Controller, Post, Req, Res } from '@nestjs/common';
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNestEndpoint,
} from '@copilotkit/runtime';

@Controller('/copilot')
export class CopilotController {
  @Post('/chat')
  chat(@Req() req: Request, @Res() res: Response) {
    const copilotRuntimeHandler = copilotRuntimeNestEndpoint({
      endpoint: '/copilot/chat',
      runtime: new CopilotRuntime(),
      serviceAdapter: new OpenAIAdapter({ model: 'gpt-4o' }),
    });

    return copilotRuntimeHandler(req, res);
  }
}