"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvanceStepDto = exports.CreateOnboardingLocationDto = exports.OwnerInfoDto = exports.BusinessAddressDto = exports.BusinessTypeDto = exports.BusinessInfoDto = exports.OnboardingStep = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var OnboardingStep;
(function (OnboardingStep) {
    OnboardingStep[OnboardingStep["ACCOUNT_CREATED"] = 1] = "ACCOUNT_CREATED";
    OnboardingStep[OnboardingStep["BUSINESS_INFO"] = 2] = "BUSINESS_INFO";
    OnboardingStep[OnboardingStep["BUSINESS_TYPE"] = 3] = "BUSINESS_TYPE";
    OnboardingStep[OnboardingStep["BUSINESS_ADDRESS"] = 4] = "BUSINESS_ADDRESS";
    OnboardingStep[OnboardingStep["OWNER_INFO"] = 5] = "OWNER_INFO";
    OnboardingStep[OnboardingStep["STRIPE_ONBOARDING"] = 6] = "STRIPE_ONBOARDING";
    OnboardingStep[OnboardingStep["KYC_KYB"] = 7] = "KYC_KYB";
    OnboardingStep[OnboardingStep["BANK_SETUP"] = 8] = "BANK_SETUP";
    OnboardingStep[OnboardingStep["SUBSCRIPTION"] = 9] = "SUBSCRIPTION";
    OnboardingStep[OnboardingStep["LOCATION"] = 10] = "LOCATION";
    OnboardingStep[OnboardingStep["PRODUCTS"] = 11] = "PRODUCTS";
    OnboardingStep[OnboardingStep["DEVICE"] = 12] = "DEVICE";
    OnboardingStep[OnboardingStep["TAP_TO_PAY"] = 13] = "TAP_TO_PAY";
    OnboardingStep[OnboardingStep["TEST_TRANSACTION"] = 14] = "TEST_TRANSACTION";
    OnboardingStep[OnboardingStep["COMPLETE"] = 15] = "COMPLETE";
})(OnboardingStep || (exports.OnboardingStep = OnboardingStep = {}));
class BusinessInfoDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, email: { required: false, type: () => String }, phone: { required: false, type: () => String }, website: { required: false, type: () => String }, description: { required: false, type: () => String } };
    }
}
exports.BusinessInfoDto = BusinessInfoDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "website", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "description", void 0);
class BusinessTypeDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { businessType: { required: true, type: () => String }, taxId: { required: false, type: () => String }, businessCategory: { required: false, type: () => String } };
    }
}
exports.BusinessTypeDto = BusinessTypeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['individual', 'company', 'non_profit', 'government_entity'] }),
    (0, class_validator_1.IsEnum)(['individual', 'company', 'non_profit', 'government_entity']),
    __metadata("design:type", String)
], BusinessTypeDto.prototype, "businessType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BusinessTypeDto.prototype, "taxId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BusinessTypeDto.prototype, "businessCategory", void 0);
class BusinessAddressDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { addressLine1: { required: true, type: () => String }, addressLine2: { required: false, type: () => String }, city: { required: true, type: () => String }, state: { required: true, type: () => String }, postalCode: { required: true, type: () => String }, country: { required: false, type: () => String }, timezone: { required: false, type: () => String } };
    }
}
exports.BusinessAddressDto = BusinessAddressDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BusinessAddressDto.prototype, "addressLine1", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BusinessAddressDto.prototype, "addressLine2", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BusinessAddressDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BusinessAddressDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BusinessAddressDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BusinessAddressDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BusinessAddressDto.prototype, "timezone", void 0);
class OwnerInfoDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { firstName: { required: true, type: () => String }, lastName: { required: true, type: () => String }, phone: { required: false, type: () => String }, title: { required: false, type: () => String } };
    }
}
exports.OwnerInfoDto = OwnerInfoDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OwnerInfoDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OwnerInfoDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OwnerInfoDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OwnerInfoDto.prototype, "title", void 0);
class CreateOnboardingLocationDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, addressLine1: { required: false, type: () => String }, addressLine2: { required: false, type: () => String }, city: { required: false, type: () => String }, state: { required: false, type: () => String }, postalCode: { required: false, type: () => String }, country: { required: false, type: () => String }, timezone: { required: false, type: () => String }, phone: { required: false, type: () => String }, email: { required: false, type: () => String }, defaultTaxRate: { required: false, type: () => Number, minimum: 0, maximum: 100 } };
    }
}
exports.CreateOnboardingLocationDto = CreateOnboardingLocationDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOnboardingLocationDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOnboardingLocationDto.prototype, "addressLine1", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOnboardingLocationDto.prototype, "addressLine2", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOnboardingLocationDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOnboardingLocationDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOnboardingLocationDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOnboardingLocationDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOnboardingLocationDto.prototype, "timezone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOnboardingLocationDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOnboardingLocationDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateOnboardingLocationDto.prototype, "defaultTaxRate", void 0);
class AdvanceStepDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { step: { required: true, type: () => Number, minimum: 1, maximum: 15 }, skipStep: { required: false, type: () => Boolean } };
    }
}
exports.AdvanceStepDto = AdvanceStepDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The step number that was just completed' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(15),
    __metadata("design:type", Number)
], AdvanceStepDto.prototype, "step", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AdvanceStepDto.prototype, "skipStep", void 0);
//# sourceMappingURL=onboarding.dto.js.map