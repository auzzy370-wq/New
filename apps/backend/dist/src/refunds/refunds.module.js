"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundsModule = void 0;
const common_1 = require("@nestjs/common");
const refunds_service_1 = require("./refunds.service");
const refunds_controller_1 = require("./refunds.controller");
const stripe_module_1 = require("../common/stripe/stripe.module");
const inventory_module_1 = require("../inventory/inventory.module");
const audit_module_1 = require("../audit/audit.module");
let RefundsModule = class RefundsModule {
};
exports.RefundsModule = RefundsModule;
exports.RefundsModule = RefundsModule = __decorate([
    (0, common_1.Module)({
        imports: [stripe_module_1.StripeModule, inventory_module_1.InventoryModule, audit_module_1.AuditModule],
        controllers: [refunds_controller_1.RefundsController],
        providers: [refunds_service_1.RefundsService],
        exports: [refunds_service_1.RefundsService],
    })
], RefundsModule);
//# sourceMappingURL=refunds.module.js.map