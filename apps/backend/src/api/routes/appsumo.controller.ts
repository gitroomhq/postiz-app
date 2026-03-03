import {
  Controller,
  HttpException,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { AppSumoService } from '@gitroom/nestjs-libraries/services/appsumo.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('AppSumo')
@Controller('/appsumo')
export class AppSumoController {
  constructor(private readonly _appSumoService: AppSumoService) {}

  @Post('/')
  async webhook(@Req() req: RawBodyRequest<Request>) {
    // @ts-ignore
    const timestamp = req.headers['x-appsumo-timestamp'] as string;
    // @ts-ignore
    const signature = req.headers['x-appsumo-signature'] as string;

    if (!timestamp || !signature) {
      throw new HttpException('Missing signature headers', 401);
    }

    this._appSumoService.validateSignature(
      req.rawBody!,
      timestamp,
      signature
    );

    try {
      const payload = JSON.parse(req.rawBody!.toString());
      return this._appSumoService.handleWebhook(payload);
    } catch (e) {
      throw new HttpException(e, 500);
    }
  }
}
