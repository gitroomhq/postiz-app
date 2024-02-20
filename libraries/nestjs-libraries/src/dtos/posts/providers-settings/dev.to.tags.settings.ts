import {IsNumber, IsString} from "class-validator";

export class DevToTagsSettings {
    @IsNumber()
    value: number;

    @IsString()
    label: string;
}