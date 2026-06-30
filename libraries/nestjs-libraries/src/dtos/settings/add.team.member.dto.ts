import {
  IsArray,
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

  // Mapped Out (Phase 2B): the specific channels and/or clients this member may
  // access. Empty = no access (must be assigned). Super Admins ignore these.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  integrationIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customerIds?: string[];

  @IsDefined()
  @IsBoolean()
  sendEmail: boolean;
}
