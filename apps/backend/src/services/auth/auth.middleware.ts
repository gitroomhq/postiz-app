import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as console from "console";
import {AuthService} from "@gitroom/helpers/auth/auth.service";
import {User} from '@prisma/client';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
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
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            req.user = user;
        }
        catch (err) {
            throw new Error('Unauthorized');
        }
        console.log('Request...');
        next();
    }
}
