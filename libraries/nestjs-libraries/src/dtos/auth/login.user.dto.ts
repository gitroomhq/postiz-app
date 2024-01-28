import {IsDefined, IsEmail, IsString, ValidateIf} from "class-validator";
import {Provider} from '@prisma/client';

export class LoginUserDto {
    @IsString()
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
}
