"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaginationParams = getPaginationParams;
exports.paginate = paginate;
function getPaginationParams(params) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
function paginate(data, total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        success: true,
        data,
        meta: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        },
    };
}
//# sourceMappingURL=pagination.util.js.map