"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetContextDto = exports.SubmitQuestionnaireDto = exports.ListReligareProfilesDto = exports.UpdateReligareProfileDto = exports.CreateReligareProfileDto = exports.RELIGARE_CONTEXTS = void 0;
const tslib_1 = require("tslib");
const class_validator_1 = require("class-validator");
exports.RELIGARE_CONTEXTS = ['agency', 'therapy'];
class CreateReligareProfileDto {
}
exports.CreateReligareProfileDto = CreateReligareProfileDto;
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateReligareProfileDto.prototype, "expertId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(120),
    tslib_1.__metadata("design:type", String)
], CreateReligareProfileDto.prototype, "name", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateReligareProfileDto.prototype, "birthDate", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5),
    tslib_1.__metadata("design:type", String)
], CreateReligareProfileDto.prototype, "birthTime", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(160),
    tslib_1.__metadata("design:type", String)
], CreateReligareProfileDto.prototype, "birthPlace", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    tslib_1.__metadata("design:type", Number)
], CreateReligareProfileDto.prototype, "birthLat", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    tslib_1.__metadata("design:type", Number)
], CreateReligareProfileDto.prototype, "birthLng", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(64),
    tslib_1.__metadata("design:type", String)
], CreateReligareProfileDto.prototype, "birthTz", void 0);
class UpdateReligareProfileDto {
}
exports.UpdateReligareProfileDto = UpdateReligareProfileDto;
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(120),
    tslib_1.__metadata("design:type", String)
], UpdateReligareProfileDto.prototype, "name", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateReligareProfileDto.prototype, "birthDate", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5),
    tslib_1.__metadata("design:type", String)
], UpdateReligareProfileDto.prototype, "birthTime", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(160),
    tslib_1.__metadata("design:type", String)
], UpdateReligareProfileDto.prototype, "birthPlace", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    tslib_1.__metadata("design:type", Number)
], UpdateReligareProfileDto.prototype, "birthLat", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    tslib_1.__metadata("design:type", Number)
], UpdateReligareProfileDto.prototype, "birthLng", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(64),
    tslib_1.__metadata("design:type", String)
], UpdateReligareProfileDto.prototype, "birthTz", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    tslib_1.__metadata("design:type", Object)
], UpdateReligareProfileDto.prototype, "brandProfile", void 0);
class ListReligareProfilesDto {
}
exports.ListReligareProfilesDto = ListReligareProfilesDto;
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], ListReligareProfilesDto.prototype, "search", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], ListReligareProfilesDto.prototype, "page", void 0);
class SubmitQuestionnaireDto {
}
exports.SubmitQuestionnaireDto = SubmitQuestionnaireDto;
tslib_1.__decorate([
    (0, class_validator_1.IsObject)(),
    tslib_1.__metadata("design:type", Object)
], SubmitQuestionnaireDto.prototype, "answers", void 0);
class SetContextDto {
}
exports.SetContextDto = SetContextDto;
tslib_1.__decorate([
    (0, class_validator_1.IsIn)(exports.RELIGARE_CONTEXTS),
    tslib_1.__metadata("design:type", String)
], SetContextDto.prototype, "context", void 0);
//# sourceMappingURL=profile.dto.js.map