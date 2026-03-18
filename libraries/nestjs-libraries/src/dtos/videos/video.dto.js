import { __decorate, __metadata } from "tslib";
import { IsIn, Validate, ValidatorConstraint } from 'class-validator';
import { VideoAbstract } from "../../videos/video.interface";
let ValidIn = class ValidIn {
    _load() {
        return (Reflect.getMetadata('video', VideoAbstract) || [])
            .filter((f) => f.available)
            .map((p) => p.identifier);
    }
    validate(text, args) {
        // Check if the text is in the list of valid video types
        const validTypes = this._load();
        return validTypes.includes(text);
    }
    defaultMessage(args) {
        // here you can provide default error message if validation failed
        return 'type must be any of: ' + this._load().join(', ');
    }
};
ValidIn = __decorate([
    ValidatorConstraint({ name: 'checkInRuntime', async: false })
], ValidIn);
export { ValidIn };
export class VideoDto {
}
__decorate([
    Validate(ValidIn),
    __metadata("design:type", String)
], VideoDto.prototype, "type", void 0);
__decorate([
    IsIn(['vertical', 'horizontal']),
    __metadata("design:type", String)
], VideoDto.prototype, "output", void 0);
//# sourceMappingURL=video.dto.js.map