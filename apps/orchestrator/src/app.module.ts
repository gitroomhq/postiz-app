import { Module } from '@nestjs/common';
import { PostActivity } from '@gitroom/orchestrator/activities/post.activity';
import { getTemporalModule } from '@gitroom/nestjs-libraries/temporal/temporal.module';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { AutopostService } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.service';
import { EmailActivity } from '@gitroom/orchestrator/activities/email.activity';
import { IntegrationsActivity } from '@gitroom/orchestrator/activities/integrations.activity';

const activities = [
  PostActivity,
  AutopostService,
  EmailActivity,
  IntegrationsActivity,
];
@Module({
  imports: [
    DatabaseModule,
    getTemporalModule(true, require.resolve('./workflows'), activities),
  ],
  controllers: [],
  providers: [...activities],
  get exports() {
    return [...this.providers, ...this.imports];
  },
})
export class AppModule {}
