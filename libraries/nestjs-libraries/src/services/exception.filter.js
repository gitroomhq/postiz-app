import { __decorate } from "tslib";
import { Catch, HttpException, } from '@nestjs/common';
import { removeAuth } from "../../../../apps/backend/src/services/auth/auth.middleware";
export class HttpForbiddenException extends HttpException {
    constructor() {
        super('Forbidden', 403);
    }
}
let HttpExceptionFilter = class HttpExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        removeAuth(response);
        return response.status(401).send();
    }
};
HttpExceptionFilter = __decorate([
    Catch(HttpForbiddenException)
], HttpExceptionFilter);
export { HttpExceptionFilter };
//# sourceMappingURL=exception.filter.js.map