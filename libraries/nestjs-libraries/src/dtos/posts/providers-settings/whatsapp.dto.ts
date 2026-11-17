import {
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';
import { Transform } from 'class-transformer';

export class WhatsAppDto {
  @Transform(({ value }) => String(value || '').replace(/[^0-9]/g, ''))
  @IsString()
  @ValidateIf((object) => !object.recipients)
  @IsNotEmpty({ message: 'WhatsApp needs a recipient number or CSV recipients before it can be sent.' })
  @ValidateIf((object, value) => !object.recipients && String(value || '').trim().length > 0)
  @Matches(/^[1-9]\d{6,14}$/, {
    message:
      'Use a valid international WhatsApp number, for example +919876543210.',
  })
  @JSONSchema({
    description:
      'Recipient phone number in international E.164 format. Spaces and dashes are accepted.',
  })
  to: string;

  @IsOptional()
  @Transform(({ value }) =>
    String(value || '')
      .split(/[\s,;|]+/)
      .map((phone) => phone.replace(/[^0-9]/g, ''))
      .filter(Boolean)
      .filter((phone, index, all) => all.indexOf(phone) === index)
      .join(',') || undefined
  )
  @IsString()
  @Matches(/^[1-9]\d{6,14}(,[1-9]\d{6,14})*$/, {
    message: 'CSV recipients must contain valid international WhatsApp numbers.',
  })
  recipients?: string;

  @IsOptional()
  @IsIn(['MESSAGE', 'CHANNEL', 'STATUS', 'AD'])
  postType?: 'MESSAGE' | 'CHANNEL' | 'STATUS' | 'AD';

  @IsOptional()
  @Transform(({ value }) => String(value || '').trim() || undefined)
  @IsString()
  @Matches(/^[a-z0-9_]+$/)
  @JSONSchema({
    description:
      'Optional approved WhatsApp template name. Leave blank for a session text/media message.',
  })
  templateName?: string;

  @IsOptional()
  @Transform(({ value }) => String(value || '').trim() || undefined)
  @IsString()
  @Matches(/^[a-z]{2}(_[A-Z]{2})?$/)
  @JSONSchema({ description: 'Template language code, for example en_US' })
  templateLanguage?: string;

  @IsOptional()
  templateHasImage?: boolean;

  // Display-only copy synced from Meta so the composer preview reflects the
  // immutable body that will actually be sent for a selected template.
  @IsOptional()
  @IsString()
  templatePreviewBody?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  waitForTemplateApproval?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  marketingOptIn?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  customerServiceWindow?: boolean;
}
