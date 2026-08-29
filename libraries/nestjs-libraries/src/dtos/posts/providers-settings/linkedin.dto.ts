import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export type LinkedinOrganicTargeting = {
  geoLocations?: string[];
  interfaceLocales?: LinkedinInterfaceLocale[];
};

export type LinkedinInterfaceLocale = {
  language: string;
  country?: string;
};

@ValidatorConstraint({ name: 'hasOrganicTargetingFacet', async: false })
class HasOrganicTargetingFacet implements ValidatorConstraintInterface {
  validate(value: LinkedinOrganicTargeting): boolean {
    return Boolean(
      value?.geoLocations?.length || value?.interfaceLocales?.length
    );
  }

  defaultMessage(): string {
    return 'organic_targeting must include geoLocations or interfaceLocales';
  }
}

export class LinkedinInterfaceLocaleDto implements LinkedinInterfaceLocale {
  @IsString()
  @Matches(/^[a-z]{2}$/)
  language: string;

  @IsString()
  @Matches(/^[A-Z]{2}$/)
  @IsOptional()
  country?: string;
}

export class LinkedinOrganicTargetingDto implements LinkedinOrganicTargeting {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(150)
  @IsString({ each: true })
  @Matches(/^urn:li:geo:\d+$/, { each: true })
  @IsOptional()
  geoLocations?: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => LinkedinInterfaceLocaleDto)
  @IsOptional()
  interfaceLocales?: LinkedinInterfaceLocaleDto[];
}

export class LinkedinDto {
  @IsBoolean()
  @IsOptional()
  post_as_images_carousel: boolean;

  @IsString()
  @IsOptional()
  carousel_name?: string;

  @Type(() => LinkedinOrganicTargetingDto)
  @ValidateNested()
  @Validate(HasOrganicTargetingFacet)
  @IsOptional()
  organic_targeting?: LinkedinOrganicTargetingDto;
}
