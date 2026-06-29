import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class AddTeamMemberDto {
  @IsDefined()
  @IsEmail()
  @ValidateIf((o) => o.sendEmail)
  email: string;

  // ADMIN = Manager, CLIENT = Client (Mapped Out roles). USER kept for
  // backwards compatibility with any pre-existing memberships.
  @IsString()
  @IsIn(['USER', 'ADMIN', 'CLIENT'])
  role: string;

  // Only meaningful for Managers (ADMIN): may they connect channels in the
  // workspace they are invited to. Clients can never connect channels.
  @IsOptional()
  @IsBoolean()
  canConnectChannels?: boolean;

  @IsDefined()
  @IsBoolean()
  sendEmail: boolean;
}
