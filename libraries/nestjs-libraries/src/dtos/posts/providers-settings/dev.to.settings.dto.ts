import {IsArray, IsDefined, IsOptional, IsString} from "class-validator";

export class DevToSettingsDto {
    @IsString()
    @IsDefined()
    title: string;

    @IsString()
    @IsOptional()
    main_image?: number;

    @IsString()
    canonical: string;

    @IsString({
        each: true
    })
    @IsArray()
    tags: string[];

    @IsString()
    @IsOptional()
    organization?: string;
}