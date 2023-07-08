import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UsersRepository } from '@clickvote/backend/src/packages/users/users.repository';
import { AuthService } from '@clickvote/backend/src/shared/auth/auth.service';
import { Types } from 'mongoose';
import { EncryptionService } from '@clickvote/nest-libraries';

@Injectable()
export class UsersService {
  constructor(
    private readonly _userRepository: UsersRepository,
    private readonly _encryptionService: EncryptionService,
    private readonly _jwtService: AuthService
  ) {}

  async getById(id: string) {
    return this._userRepository.getById(id);
  }

  async getByEmail(email: string) {
    return this._userRepository.getByEmail(email);
  }

  async checkPassword(password: string, encryptedPassword: string) {
    return this._encryptionService.comparePassword(password, encryptedPassword);
  }

  async checkUser(email: string) {
    const emailModel = await this.getByEmail(email);
    if (emailModel) {
      throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
    }

    return emailModel;
  }

  async sign(id: string) {
    return this._jwtService.sign({ id });
  }

  async register(email: string, password: string, org: Types.ObjectId) {
    const encryptedPassword = await this._encryptionService.hashPassword(
      password
    );

    const register = await this._userRepository.register(
      email,
      encryptedPassword,
      org
    );

    return this.sign(register.id);
  }
}
