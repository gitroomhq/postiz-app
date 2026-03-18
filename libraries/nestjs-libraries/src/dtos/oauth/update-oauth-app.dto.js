import { __decorate, __metadata } from "tslib";
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
export class UpdateOAuthAppDto {
}
__decorate([
    IsString(),
    IsOptional(),
    MaxLength(100),
    __metadata("design:type", String)
], UpdateOAuthAppDto.prototype, "name", void 0);
__decorate([
    IsString(),
    IsOptional(),
    MaxLength(500),
    __metadata("design:type", String)
], UpdateOAuthAppDto.prototype, "description", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UpdateOAuthAppDto.prototype, "pictureId", void 0);
__decorate([
    IsString(),
    IsOptional(),
    IsUrl(),
    __metadata("design:type", String)
], UpdateOAuthAppDto.prototype, "redirectUrl", void 0);
//# sourceMappingURL=update-oauth-app.dto.js.map