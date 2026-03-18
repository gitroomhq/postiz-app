import { __decorate, __metadata } from "tslib";
import { IsDefined, IsString, MinLength } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';
export class DiscordDto {
}
__decorate([
    MinLength(1),
    IsDefined(),
    IsString(),
    JSONSchema({
        description: 'Channel must be an id',
    }),
    __metadata("design:type", String)
], DiscordDto.prototype, "channel", void 0);
//# sourceMappingURL=discord.dto.js.map