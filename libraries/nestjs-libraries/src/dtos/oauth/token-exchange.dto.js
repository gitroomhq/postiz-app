import { __decorate, __metadata } from "tslib";
import { IsDefined, IsString } from 'class-validator';
export class TokenExchangeDto {
}
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], TokenExchangeDto.prototype, "grant_type", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], TokenExchangeDto.prototype, "code", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], TokenExchangeDto.prototype, "client_id", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], TokenExchangeDto.prototype, "client_secret", void 0);
//# sourceMappingURL=token-exchange.dto.js.map