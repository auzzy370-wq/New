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
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
let EmployeesService = class EmployeesService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async create(merchantId, data, actorUserId) {
        const pinHash = data.pin ? await bcrypt.hash(data.pin, 10) : undefined;
        const employee = await this.prisma.employee.create({
            data: {
                merchantId,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                pin: pinHash,
                role: data.role || client_1.UserRole.MERCHANT_CASHIER,
                permissions: data.permissions || [],
                locations: data.locationIds
                    ? { create: data.locationIds.map((locationId) => ({ locationId })) }
                    : undefined,
            },
        });
        await this.audit.log({
            merchantId,
            userId: actorUserId,
            action: client_1.AuditAction.EMPLOYEE_CREATE,
            resource: 'employee',
            resourceId: employee.id,
            after: { name: `${employee.firstName} ${employee.lastName}`, role: employee.role },
        });
        return employee;
    }
    async findAll(merchantId) {
        return this.prisma.employee.findMany({
            where: { merchantId, deletedAt: null },
            include: { locations: { include: { location: { select: { name: true } } } } },
            orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }],
        });
    }
    async findById(merchantId, id) {
        const employee = await this.prisma.employee.findFirst({
            where: { id, merchantId, deletedAt: null },
            include: { locations: { include: { location: true } } },
        });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        const { pin, ...safe } = employee;
        void pin;
        return safe;
    }
    async update(merchantId, id, data, actorUserId) {
        const before = await this.findById(merchantId, id);
        const updated = await this.prisma.employee.update({ where: { id }, data });
        await this.audit.log({
            merchantId,
            userId: actorUserId,
            action: client_1.AuditAction.EMPLOYEE_UPDATE,
            resource: 'employee',
            resourceId: id,
            before: before,
            after: data,
        });
        return updated;
    }
    async validatePin(merchantId, employeeId, pin) {
        const employee = await this.prisma.employee.findFirst({
            where: { id: employeeId, merchantId },
        });
        if (!employee?.pin)
            return false;
        return bcrypt.compare(pin, employee.pin);
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map