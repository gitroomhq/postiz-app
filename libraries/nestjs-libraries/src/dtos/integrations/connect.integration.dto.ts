import {IsDefined, IsString} from "class-validator";

export class ConnectIntegrationDto {
    @IsString()
    @IsDefined()
    state: string;

    @IsString()
    @IsDefined()
    code: string;
}