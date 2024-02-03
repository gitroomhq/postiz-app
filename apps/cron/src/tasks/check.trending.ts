import { Injectable } from '@nestjs/common';
import {Interval} from '@nestjs/schedule';

@Injectable()
export class CheckTrending {
    @Interval(3600000)
    checkTrending() {
        console.log('hello');
    }
}