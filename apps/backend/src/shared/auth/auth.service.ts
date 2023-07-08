import { Injectable } from '@nestjs/common';
import { verify, sign } from 'jsonwebtoken';

@Injectable()
export class AuthService {
  validate(jwtString: string) {
    try {
      return verify(jwtString, process.env.JWT_SECRET);
    } catch (err) {
      return false;
    }
  }

  sign(payload: any) {
    return sign(payload, process.env.JWT_SECRET);
  }
}
