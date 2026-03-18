import { __decorate } from "tslib";
import { ValidatorConstraint, } from 'class-validator';
import striptags from 'striptags';
let ValidContent = class ValidContent {
    validate(contentRaw, args) {
        var _a, _b, _c;
        const content = striptags(contentRaw || '');
        if (
        // @ts-ignore
        (!((_a = args === null || args === void 0 ? void 0 : args.object) === null || _a === void 0 ? void 0 : _a.image) || !Array.isArray((_b = args === null || args === void 0 ? void 0 : args.object) === null || _b === void 0 ? void 0 : _b.image) || !((_c = args === null || args === void 0 ? void 0 : args.object) === null || _c === void 0 ? void 0 : _c.image.length)) &&
            (!content || typeof content !== 'string' || (content === null || content === void 0 ? void 0 : content.trim()) === '')) {
            return false;
        }
        return true;
    }
    defaultMessage(args) {
        // here you can provide default error message if validation failed
        return ' If images do not exist, content must be a non-empty string.';
    }
};
ValidContent = __decorate([
    ValidatorConstraint({ name: 'validateContent', async: false })
], ValidContent);
export { ValidContent };
//# sourceMappingURL=valid.images.js.map