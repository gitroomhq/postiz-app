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
      // @ts-ignore
      serviceAdapter: new OpenAIAdapter({ model: req?.body?.variables?.data?.metadata?.requestType === 'TextareaCompletion' ? 'gpt-4o-mini' : 'gpt-4o' }),
    });

    // @ts-ignore
    return copilotRuntimeHandler(req, res);
  }
}