import { Logger, Controller, Get, Post, Req, Res, Body } from '@nestjs/common';
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNestEndpoint,
} from '@copilotkit/runtime';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { CommunicationService } from '@gitroom/backend/services/communication/communication.service';
import { DocumentationService } from '@gitroom/backend/services/documentation/documentation.service';

@Controller('/copilot')
export class CopilotController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _communicationService: CommunicationService,
    private _documentationService: DocumentationService
  ) {}

  @Post('/chat')
  chat(@Req() req: Request, @Res() res: Response) {
    if (process.env.OPENAI_API_KEY === undefined || process.env.OPENAI_API_KEY === '') {
      Logger.warn('OpenAI API key not set, chat functionality will not work');
      return
    }

    const copilotRuntimeHandler = copilotRuntimeNestEndpoint({
      endpoint: '/copilot/chat',
      runtime: new CopilotRuntime(),
      serviceAdapter: new OpenAIAdapter({
        model:
          // @ts-ignore
          req?.body?.variables?.data?.metadata?.requestType ===
          'TextareaCompletion'
            ? 'gpt-4o-mini'
            : 'gpt-4o-2024-08-06',
      }),
    });

    // @ts-ignore
    return copilotRuntimeHandler(req, res);
  }

  @Get('/credits')
  calculateCredits(@GetOrgFromRequest() organization: Organization) {
    return this._subscriptionService.checkCredits(organization);
  }

  @Post('/communicate')
  async facilitateCommunication(
    @Body() body: { message: string; recipients: string[] },
    @Res() response: Response
  ) {
    try {
      const result = await this._communicationService.sendMessage(
        body.message,
        body.recipients
      );
      response.status(200).json(result);
    } catch (e) {
      response.status(400).send(e.message);
    }
  }

  @Post('/generate-documentation')
  async generateDocumentation(
    @Body() body: { projectId: string },
    @Res() response: Response
  ) {
    try {
      const documentation = await this._documentationService.generateDocumentation(
        body.projectId
      );
      response.status(200).json(documentation);
    } catch (e) {
      response.status(400).send(e.message);
    }
  }

  @Post('/integrate-slack')
  async integrateSlack(
    @Body() body: { slackToken: string },
    @Res() response: Response
  ) {
    try {
      const result = await this._communicationService.integrateSlack(body.slackToken);
      response.status(200).json(result);
    } catch (e) {
      response.status(400).send(e.message);
    }
  }

  @Post('/integrate-teams')
  async integrateTeams(
    @Body() body: { teamsToken: string },
    @Res() response: Response
  ) {
    try {
      const result = await this._communicationService.integrateTeams(body.teamsToken);
      response.status(200).json(result);
    } catch (e) {
      response.status(400).send(e.message);
    }
  }
}
