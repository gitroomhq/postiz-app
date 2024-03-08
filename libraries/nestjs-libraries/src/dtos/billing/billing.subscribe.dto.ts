import {IsIn, Max, Min} from "class-validator";

export class BillingSubscribeDto {
    @Min(1)
    @Max(60)
    total: number;

    @IsIn(['MONTHLY', 'YEARLY'])
    period: 'MONTHLY' | 'YEARLY';

    @IsIn(['STANDARD', 'PRO'])
    billing: 'STANDARD' | 'PRO';
}
