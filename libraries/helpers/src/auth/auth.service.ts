import {sign, verify} from 'jsonwebtoken';
import {hashSync, compareSync} from 'bcrypt';

export class AuthService {
 static hashPassword (password: string) {
    return hashSync(password, 10);
 }
 static comparePassword (password: string, hash: string) {
    return compareSync(password, hash);
 }
 static signJWT (value: object) {
  return sign(value, process.env.JWT_SECRET!);
 }
 static verifyJWT (token: string) {
  return verify(token, process.env.JWT_SECRET!);
 }
}
