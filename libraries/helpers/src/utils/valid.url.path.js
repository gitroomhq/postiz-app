import { __decorate } from "tslib";
import { ValidatorConstraint, } from 'class-validator';
let ValidUrlExtension = class ValidUrlExtension {
    validate(text, args) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        return (!!((_b = (_a = text === null || text === void 0 ? void 0 : text.split) === null || _a === void 0 ? void 0 : _a.call(text, '?')) === null || _b === void 0 ? void 0 : _b[0].endsWith('.png')) ||
            !!((_d = (_c = text === null || text === void 0 ? void 0 : text.split) === null || _c === void 0 ? void 0 : _c.call(text, '?')) === null || _d === void 0 ? void 0 : _d[0].endsWith('.jpg')) ||
            !!((_f = (_e = text === null || text === void 0 ? void 0 : text.split) === null || _e === void 0 ? void 0 : _e.call(text, '?')) === null || _f === void 0 ? void 0 : _f[0].endsWith('.jpeg')) ||
            !!((_h = (_g = text === null || text === void 0 ? void 0 : text.split) === null || _g === void 0 ? void 0 : _g.call(text, '?')) === null || _h === void 0 ? void 0 : _h[0].endsWith('.gif')) ||
            !!((_k = (_j = text === null || text === void 0 ? void 0 : text.split) === null || _j === void 0 ? void 0 : _j.call(text, '?')) === null || _k === void 0 ? void 0 : _k[0].endsWith('.webp')) ||
            !!((_m = (_l = text === null || text === void 0 ? void 0 : text.split) === null || _l === void 0 ? void 0 : _l.call(text, '?')) === null || _m === void 0 ? void 0 : _m[0].endsWith('.mp4')));
    }
    defaultMessage(args) {
        // here you can provide default error message if validation failed
        return ('File must have a valid extension: .png, .jpg, .jpeg, .gif, .webp, or .mp4');
    }
};
ValidUrlExtension = __decorate([
    ValidatorConstraint({ name: 'checkValidExtension', async: false })
], ValidUrlExtension);
export { ValidUrlExtension };
let ValidUrlPath = class ValidUrlPath {
    validate(text, args) {
        if (!process.env.RESTRICT_UPLOAD_DOMAINS) {
            return true;
        }
        return ((text || 'invalid url').indexOf(process.env.RESTRICT_UPLOAD_DOMAINS) > -1);
    }
    defaultMessage(args) {
        // here you can provide default error message if validation failed
        return ('URL must contain the domain: ' + process.env.RESTRICT_UPLOAD_DOMAINS + ' Make sure you first use the upload API route.');
    }
};
ValidUrlPath = __decorate([
    ValidatorConstraint({ name: 'checkValidPath', async: false })
], ValidUrlPath);
export { ValidUrlPath };
//# sourceMappingURL=valid.url.path.js.map