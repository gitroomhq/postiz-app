import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UsersService } from '@clickvote/backend/src/packages/users/users.service';
import { OrgService } from '@clickvote/backend/src/packages/org/org.service';
import { AuthValidator } from '@clickvote/validations';
import { EnvironmentService } from '@clickvote/backend/src/packages/environment/environment.service';

@Injectable()
export class RegistrationLoginService {
  constructor(
    private _userService: UsersService,
    private _orgService: OrgService,
    private _environmentService: EnvironmentService
  ) {}

  async register(register: AuthValidator) {
    await this._userService.checkUser(register.email);

    const org = await this._orgService.createOrg('No Name');

    const env = await this._environmentService.createDevAndProduction(org.id);

    return this._userService.register(
      register.email,
      register.password,
      org.id
    );
  }

  async login(login: AuthValidator) {
    const user = await this._userService.getByEmail(login.email);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
    }

    const checkPassword = await this._userService.checkPassword(
      login.password,
      user.password
    );

    if (!checkPassword) {
      throw new Error('Password not match');
    }

    return this._userService.sign(user.id);
  }
}
