import { __decorate } from "tslib";
import { Catch } from '@nestjs/common';
import { NotEnoughScopes } from "./social.abstract";
import { HttpStatusCode } from 'axios';
let NotEnoughScopesFilter = class NotEnoughScopesFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        response
            .status(HttpStatusCode.Conflict)
            .json({ msg: exception.message });
    }
};
NotEnoughScopesFilter = __decorate([
    Catch(NotEnoughScopes)
], NotEnoughScopesFilter);
export { NotEnoughScopesFilter };
//# sourceMappingURL=integration.missing.scopes.js.map