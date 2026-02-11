import { IsBoolean } from 'class-validator';

export class EmailNotificationsDto {
  @IsBoolean()
  sendSuccessEmails: boolean;

  @IsBoolean()
  sendFailureEmails: boolean;

  @IsBoolean()
  sendStreakEmails: boolean;
}

