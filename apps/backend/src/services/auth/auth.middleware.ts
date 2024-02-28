import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {AuthService} from "@gitroom/helpers/auth/auth.service";
import {User} from '@prisma/client';
import {OrganizationService} from "@gitroom/nestjs-libraries/database/prisma/organizations/organization.service";

@Injectable()
export class AuthMiddleware implements NestMiddleware {
    constructor(
        private _organizationService: OrganizationService,
    ) {
    }
    async use(req: Request, res: Response, next: NextFunction) {
        const auth = req.headers.auth || req.cookies.auth;
        if (!auth) {
            throw new Error('Unauthorized');
        }
        try {
            const user = AuthService.verifyJWT(auth) as User | null;
            if (!user) {
                throw new Error('Unauthorized');
            }

            delete user.password;
            const organization = await this._organizationService.getFirstOrgByUserId(user.id);

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            req.user = user;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            req.org  = organization;
        }
        catch (err) {
            throw new Error('Unauthorized');
        }
        console.log('Request...');
        next();
    }
}
