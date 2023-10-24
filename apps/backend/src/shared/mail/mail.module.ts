import { Module } from '@nestjs/common';
import { MailService } from '@clickvote/backend/src/shared/mail/mail.service';
import { HttpModule } from '@nestjs/axios';
import { ResendService } from '@clickvote/backend/src/shared/mail/providers/resend.api';

@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [MailService, ResendService],
  get exports() {
    return this.providers;
  },
})
export class MailModule {}
