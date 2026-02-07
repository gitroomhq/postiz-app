import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.webhooksService.list(user.organizationId);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: { url: string; events: string[]; active?: boolean },
  ) {
    return this.webhooksService.create(user.organizationId, body);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { url?: string; events?: string[]; active?: boolean },
  ) {
    return this.webhooksService.update(user.organizationId, id, body);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.webhooksService.remove(user.organizationId, id);
  }
}
