"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminOnly = exports.IS_ADMIN_KEY = exports.Public = exports.IS_PUBLIC_KEY = exports.RequirePermissions = exports.PERMISSIONS_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.PERMISSIONS_KEY = 'permissions';
const RequirePermissions = (...permissions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
exports.RequirePermissions = RequirePermissions;
exports.IS_PUBLIC_KEY = 'isPublic';
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;
exports.IS_ADMIN_KEY = 'isAdmin';
const AdminOnly = () => (0, common_1.SetMetadata)(exports.IS_ADMIN_KEY, true);
exports.AdminOnly = AdminOnly;
//# sourceMappingURL=permissions.decorator.js.map