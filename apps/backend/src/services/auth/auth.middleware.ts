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
            const orgHeader = req.cookies.showorg || req.headers.showorg;

            if (!user) {
                throw new Error('Unauthorized');
            }

            delete user.password;
            const organization = await this._organizationService.getOrgsByUserId(user.id);
            const setOrg = organization.find((org) => org.id === orgHeader) || organization[0];


            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            req.user = user;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            req.org  = setOrg;
        }
        catch (err) {
            throw new Error('Unauthorized');
        }
        console.log('Request...');
        next();
    }
}
