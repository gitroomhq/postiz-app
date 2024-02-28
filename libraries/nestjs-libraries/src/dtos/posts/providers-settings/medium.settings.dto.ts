import {ArrayMaxSize, IsArray, IsDefined, IsOptional, IsString, Matches, MinLength, ValidateNested} from "class-validator";

export class MediumTagsSettings {
    @IsString()
    value: string;

    @IsString()
    label: string;
}

export class MediumSettingsDto {
    @IsString()
    @MinLength(2)
    @IsDefined()
    title: string;

    @IsString()
    @MinLength(2)
    @IsDefined()
    subtitle: string;

    @IsOptional()
    @IsString()
    @Matches(/^(|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/, {
        message: 'Invalid URL'
    })
    canonical?: string;

    @IsString()
    @IsOptional()
    publication?: string;

    @IsArray()
    @ArrayMaxSize(4)
    @IsOptional()
    tags: MediumTagsSettings[];
}