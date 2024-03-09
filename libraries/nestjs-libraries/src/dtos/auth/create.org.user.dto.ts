import {IsDefined, IsEmail, IsString, MinLength, ValidateIf} from "class-validator";
import {Provider} from '@prisma/client';

export class CreateOrgUserDto {
    @IsString()
    @MinLength(3)
    @IsDefined()
    @ValidateIf(o => !o.providerToken)
    password: string;

    @IsString()
    @IsDefined()
    provider: Provider;

    @IsString()
    @IsDefined()
    @ValidateIf(o => !o.password)
    providerToken: string;

    @IsEmail()
    @IsDefined()
    email: string;

    @IsString()
    @IsDefined()
    @MinLength(3)
    company: string;
}
