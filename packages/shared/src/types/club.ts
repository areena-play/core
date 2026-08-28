export interface ClubDto {
    id: string;
    name: string;
    code: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    email: string;
    phone: string;
    website?: string | null;
    logoUrl?: string | null;
    createdAt: string;
    updatedAt: string;
    associations?: Array<{
        associationId: string;
        association: {
            id: string;
            name: string;
            shortName: string;
            code: string;
        };
    }>;
}

