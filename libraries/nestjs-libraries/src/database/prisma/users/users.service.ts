import {Injectable} from "@nestjs/common";
import {UsersRepository} from "@gitroom/nestjs-libraries/database/prisma/users/users.repository";
import {Provider} from "@prisma/client";

@Injectable()
export class UsersService {
    constructor(
        private _usersRepository: UsersRepository
    ){}

    getUserByEmail(email: string) {
        return this._usersRepository.getUserByEmail(email);
    }

    getUserByProvider(providerId: string, provider: Provider) {
        return this._usersRepository.getUserByProvider(providerId, provider);
    }
}