import { __decorate, __metadata } from "tslib";
import { IsDefined, IsString, Validate } from 'class-validator';
import { ValidUrlExtension } from "../../../../helpers/src/utils/valid.url.path";
export class UploadDto {
}
__decorate([
    IsString(),
    IsDefined(),
    Validate(ValidUrlExtension),
    __metadata("design:type", String)
], UploadDto.prototype, "url", void 0);
//# sourceMappingURL=upload.dto.js.map