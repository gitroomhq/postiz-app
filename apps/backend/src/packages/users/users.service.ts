import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UsersRepository } from '@clickvote/backend/src/packages/users/users.repository';
import { AuthService } from '@clickvote/backend/src/shared/auth/auth.service';
import { Types } from 'mongoose';
import { EncryptionService } from '@clickvote/nest-libraries';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UsersService {
  constructor(
    private readonly _userRepository: UsersRepository,
    private readonly _encryptionService: EncryptionService,
    private readonly _jwtService: AuthService,
    private readonly _httpService: HttpService
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

  async subscribeToNewsletter(email: string) {
    try {
      const subscription = await firstValueFrom(
        this._httpService.post(
          'https://substackapi.com/api/subscribe',
          {
            email: email,
            domain: new URL(process.env.SUBSTACK_NEWSLETTER_URL!).hostname,
          },
          {
            headers: {
              'Cache-Length': 0,
            },
          }
        )
      );

      if (subscription.status == 200) {
        console.log(`${email} - SUBSCRIBED to newsletter`);
      } else {
        console.log(`${email} - FAILED to subscribe to newsletter`);
      }
    } catch (err) {
      console.log(`NewsletterSubscriptionError :: ${err}`);
    }
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

    await this.subscribeToNewsletter(email);

    return this.sign(register.id);
  }
}
