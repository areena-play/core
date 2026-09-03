export enum AssociationLevel {
    NATIONAL = 'NATIONAL',
    REGIONAL = 'REGIONAL',
    LOCAL = 'LOCAL',
}

export type VisibilityScope = 'PUBLIC' | 'AUTHENTICATED' | 'FEDERATION_ONLY';

export interface PrivacyRuleConfig {
    competitionsVisibility?: VisibilityScope;
    clubsVisibility?: VisibilityScope;
    peopleVisibility?: VisibilityScope;
    allowPlayerAnonymization?: boolean;
    maskMinorNamesByDefault?: boolean;
}

export interface AssociationRuleConfig {
    rankingSystem?: string;
    matchRules?: Record<string, any>;
    autoApproveDomesticTCards?: boolean;
    refresherValidityMonths?: number;
    licenseIdTemplate?: string;
    privacy?: PrivacyRuleConfig;
    customRules?: Record<string, any>;
}

export interface AssociationDto {
    id: string;
    name: string;
    shortName: string;
    code: string;
    level: AssociationLevel;
    isTopLevel: boolean;
    rules: AssociationRuleConfig;
    licenseIdTemplate: string;
    licenseCounter: number;
    regionDigit: number;
    logoUrl?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SeasonDto {
    id: string;
    associationId: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    createdAt: string;
    updatedAt: string;
}

