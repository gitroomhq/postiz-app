import { Controller, Post, Req, Res } from '@nestjs/common';
import { CopilotRuntime, OpenAIAdapter } from '@copilotkit/backend';

@Controller('/copilot')
export class CopilotController {
  @Post('/chat')
  chat(@Req() req: Request, @Res() res: Response) {
    const copilotKit = new CopilotRuntime({});
    return copilotKit.streamHttpServerResponse(
      req,
      res,
      new OpenAIAdapter({ model: 'gpt-4o' })
    );
  }
}
