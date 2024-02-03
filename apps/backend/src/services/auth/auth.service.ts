import {Injectable} from "@nestjs/common";
import {Provider, User} from '@prisma/client';
import {CreateOrgUserDto} from "@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto";
import {LoginUserDto} from "@gitroom/nestjs-libraries/dtos/auth/login.user.dto";
import {UsersService} from "@gitroom/nestjs-libraries/database/prisma/users/users.service";
import {OrganizationService} from "@gitroom/nestjs-libraries/database/prisma/organizations/organization.service";
import {AuthService as AuthChecker} from "@gitroom/helpers/auth/auth.service";
import {ProvidersFactory} from "@gitroom/backend/services/auth/providers/providers.factory";
import * as console from "console";

@Injectable()
export class AuthService {
    constructor(
        private _user: UsersService,
        private _organization: OrganizationService,
    ) {
    }
    async routeAuth(
        provider: Provider,
        body: CreateOrgUserDto | LoginUserDto
    ) {
        if (provider === Provider.LOCAL) {
            const user = await this._user.getUserByEmail(body.email);
            if (body instanceof CreateOrgUserDto) {
                if (user) {
                    throw new Error('User already exists');
                }

                const create = await this._organization.createOrgAndUser(body);
                return this.jwt(create.users[0].user);
            }

            if (!user || !AuthChecker.comparePassword(body.password, user.password)) {
                throw new Error('Invalid user');
            }

            return this.jwt(user);
        }

        const user = await this.loginOrRegisterProvider(provider, body as LoginUserDto);
        return this.jwt(user);
    }

    private async loginOrRegisterProvider(provider: Provider, body: LoginUserDto) {
        const providerInstance = ProvidersFactory.loadProvider(provider);
        const providerUser = await providerInstance.getUser(body.providerToken);
        if (!providerUser) {
            throw new Error('Invalid provider token');
        }

        const user = await this._user.getUserByProvider(providerUser.id, provider);
        if (user) {
            return user;
        }

        const create = await this._organization.createOrgAndUser({
            company: '',
            email: providerUser.email,
            password: '',
            provider,
            providerId: providerUser.id
        });

        return create.users[0].user;
    }

    private async jwt(user: User) {
        return AuthChecker.signJWT(user);
    }
}