import {IsDefined, IsString, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';

export class SaveConfigurationVariableDto {
  @IsString()
  key: string;

  @IsString()
  val: string;
}

export class SaveConfigurationVariablesDto {
  @ValidateNested({each: true})
  @Type(() => ConfigurationVariableDto)
  configurationVariables: Record<string, ConfigurationVariableDto>;
}
