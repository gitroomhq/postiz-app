import { __decorate, __metadata } from "tslib";
import { IsDefined, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
export class CreateOAuthAppDto {
}
__decorate([
    IsString(),
    IsDefined(),
    MaxLength(100),
    __metadata("design:type", String)
], CreateOAuthAppDto.prototype, "name", void 0);
__decorate([
    IsString(),
    IsOptional(),
    MaxLength(500),
    __metadata("design:type", String)
], CreateOAuthAppDto.prototype, "description", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], CreateOAuthAppDto.prototype, "pictureId", void 0);
__decorate([
    IsString(),
    IsDefined(),
    IsUrl(),
    __metadata("design:type", String)
], CreateOAuthAppDto.prototype, "redirectUrl", void 0);
//# sourceMappingURL=create-oauth-app.dto.js.map