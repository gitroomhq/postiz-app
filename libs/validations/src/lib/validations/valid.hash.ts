import {PipeTransform, Injectable, BadRequestException, Param} from '@nestjs/common';
import { Types } from 'mongoose';
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<any, string> {
  public transform(value: string): string {
    try {
      const load = new Types.ObjectId(value);
      return load.toHexString();
    } catch (error) {
      throw new BadRequestException('Validation failed (ObjectId is expected)');
    }
  }
}

export const ValidateId = (id: string) => Param('id', ParseObjectIdPipe);
