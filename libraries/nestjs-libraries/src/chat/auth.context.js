import { __awaiter } from "tslib";
import { getAuth } from "./async.storage";
export const checkAuth = (_a, options_1) => __awaiter(void 0, [_a, options_1], void 0, function* ({ runtimeContext }, options) {
    var _b, _c;
    const auth = getAuth();
    // @ts-ignore
    if (((_b = options === null || options === void 0 ? void 0 : options.extra) === null || _b === void 0 ? void 0 : _b.authInfo) || auth) {
        runtimeContext.set(
        // @ts-ignore
        'organization', 
        // @ts-ignore
        JSON.stringify(((_c = options === null || options === void 0 ? void 0 : options.extra) === null || _c === void 0 ? void 0 : _c.authInfo) || auth));
        // @ts-ignore
        runtimeContext.set('ui', 'false');
    }
});
//# sourceMappingURL=auth.context.js.map