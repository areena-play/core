export enum InvoiceStatus {
    DRAFT = 'DRAFT',
    SENT = 'SENT',
    PAID = 'PAID',
    OVERDUE = 'OVERDUE',
    CANCELLED = 'CANCELLED',
}

export enum InvoiceCategory {
    MEMBERSHIP_FEE = 'MEMBERSHIP_FEE',
    LICENSE_FEE = 'LICENSE_FEE',
    COMPETITION_ENTRY = 'COMPETITION_ENTRY',
    COURSE_FEE = 'COURSE_FEE',
    EQUIPMENT = 'EQUIPMENT',
    PENALTY = 'PENALTY',
    OTHER = 'OTHER',
}

export enum InvoiceTargetType {
    MEMBER_CLUB = 'MEMBER_CLUB',
    CLUB_MEMBER = 'CLUB_MEMBER',
    INDIVIDUAL_PLAYER = 'INDIVIDUAL_PLAYER',
    SUB_ASSOCIATION = 'SUB_ASSOCIATION',
    OTHER = 'OTHER',
}

export interface InvoiceLineItemDto {
    id?: string;
    position?: number;
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    totalPrice?: number;
    taxRate?: number;
    bexioArticleId?: number | null;
}

export interface InvoiceDto {
    id: string;
    invoiceNumber: string;
    associationId?: string | null;
    clubId?: string | null;
    targetType: InvoiceTargetType;
    recipientClubId?: string | null;
    recipientUserId?: string | null;
    recipientName: string;
    recipientEmail?: string | null;
    recipientAddress?: string | null;
    status: InvoiceStatus;
    category: InvoiceCategory;
    currency: string;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    issueDate: string;
    dueDate: string;
    paidAt?: string | null;
    notes?: string | null;
    terms?: string | null;
    bexioId?: number | null;
    bexioSyncedAt?: string | null;
    bexioSyncStatus?: string | null;
    bexioQrPdfUrl?: string | null;
    createdAt: string;
    updatedAt: string;
    lineItems?: InvoiceLineItemDto[];
    association?: any;
    club?: any;
    recipientClub?: any;
    recipientUser?: any;
}

export interface BexioConfigDto {
    id?: string;
    associationId?: string | null;
    clubId?: string | null;
    apiToken?: string | null;
    userId?: number | null;
    bankAccountId?: number | null;
    taxId?: number | null;
    paymentTypeId?: number | null;
    iban?: string | null;
    qrIban?: string | null;
    companyName?: string | null;
    companyAddress?: string | null;
    autoSync: boolean;
    isConnected: boolean;
    lastSyncAt?: string | null;
}

