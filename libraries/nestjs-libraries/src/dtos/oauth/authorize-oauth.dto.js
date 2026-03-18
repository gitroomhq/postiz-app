import { __decorate, __metadata } from "tslib";
import { IsDefined, IsIn, IsOptional, IsString } from 'class-validator';
export class AuthorizeOAuthQueryDto {
}
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], AuthorizeOAuthQueryDto.prototype, "client_id", void 0);
__decorate([
    IsString(),
    IsDefined(),
    IsIn(['code']),
    __metadata("design:type", String)
], AuthorizeOAuthQueryDto.prototype, "response_type", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], AuthorizeOAuthQueryDto.prototype, "state", void 0);
export class ApproveOAuthDto {
}
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], ApproveOAuthDto.prototype, "client_id", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], ApproveOAuthDto.prototype, "state", void 0);
__decorate([
    IsString(),
    IsDefined(),
    IsIn(['approve', 'deny']),
    __metadata("design:type", String)
], ApproveOAuthDto.prototype, "action", void 0);
//# sourceMappingURL=authorize-oauth.dto.js.map