export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    OTHER = 'OTHER',
}

export enum GenderRestriction {
    ANY = 'ANY',
    MALE_ONLY = 'MALE_ONLY',
    FEMALE_ONLY = 'FEMALE_ONLY',
    MIXED = 'MIXED',
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

