import { __decorate, __metadata } from "tslib";
import { IsDefined, IsOptional, IsString } from 'class-validator';
export class ConnectIntegrationDto {
}
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], ConnectIntegrationDto.prototype, "state", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], ConnectIntegrationDto.prototype, "code", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], ConnectIntegrationDto.prototype, "timezone", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], ConnectIntegrationDto.prototype, "refresh", void 0);
//# sourceMappingURL=connect.integration.dto.js.map