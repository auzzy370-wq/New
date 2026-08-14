export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResult<T> {
    success: boolean;
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}
export declare function getPaginationParams(params: PaginationParams): {
    page: number;
    limit: number;
    skip: number;
};
export declare function paginate<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T>;
