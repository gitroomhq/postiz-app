import {IsDefined, IsIn, IsNumber, IsOptional} from "class-validator";

export class StarsListDto {
    @IsNumber()
    @IsDefined()
    page: number;

    @IsOptional()
    @IsIn(['totalStars', 'stars', 'date'])
    sortBy: 'date' | 'stars' | 'totalStars';
}