'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Sliders,
    Shield,
    CheckCircle2,
    AlertCircle,
    Key,
    Building2,
    Image as ImageIcon,
    Upload,
    Trash2,
    Trophy,
    Calendar,
    Users,
    Plus,
    Edit3,
    X,
    Save,
    Phone,
    MapPin,
    Mail,
    Globe,
    FileText,
    Award,
    Sparkles,
    Clock,
    Check,
    Layers,
    UserCheck,
    HelpCircle,
    ExternalLink,
    Search,
    Table as TableIcon,
    ArrowDownUp,
    RotateCcw,
    ArrowUp,
    ArrowDown,
    ChevronUp,
    ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { getAllCountryPhoneOptions, DEFAULT_PRIORITIZED_COUNTRIES, LevelTierDefinition, ELO_TIERS_DATA } from '@areena/shared';
import { FlagIcon } from '@/components/ui/FlagIcon';
import { prompt, confirm } from '@/lib/dialog';

// ==========================================
// TYPES & DATA STRUCTURES
// ==========================================

interface OfficialItem {
    id: string;
    userId: string;
    associationId: string;
    role: string;
    createdAt: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email?: string | null;
        phone?: string | null;
        avatarUrl?: string | null;
        eloPoints?: number;
        licenseId?: string | null;
        currentLevel?: string;
    };
}

const OFFICIAL_ROLES = [
    { value: 'ADMIN', label: 'System Administrator', description: 'Full administrative access across federation governance, data, and system settings' },
    { value: 'PRESIDENT', label: 'Association President', description: 'Executive head of the association and chief representative' },
    { value: 'VICE_PRESIDENT', label: 'Vice President', description: 'Deputy executive officer and board representation' },
    { value: 'SECRETARY', label: 'General Secretary', description: 'Administrative operations, correspondence, and federation protocol' },
    { value: 'TREASURER', label: 'Financial Director / Treasurer', description: 'Financial management, licensing accounting, and budget oversight' },
    { value: 'REFEREE_HEAD', label: 'Head of Match Officials', description: 'Umpire coordination, rules enforcement, and referee development' },
    { value: 'COACH_HEAD', label: 'Head of Coaching & Education', description: 'Coaching certification, youth development, and training curricula' },
    { value: 'COMMUNICATIONS', label: 'Media & PR Officer', description: 'Public relations, news, marketing, and federation press releases' },
    { value: 'MEMBER', label: 'Board / Committee Member', description: 'General committee member and governance delegate' },
];

interface SportItem {
    id: string;
    name: string;
    unitNaming: string;
    isCustom?: boolean;
    active: boolean;
    matchFormat?: string;
    pointsPerSet?: number;
}

interface AgeSeriesItem {
    id: string;
    code: string;
    name: string;
    type: 'YOUTH' | 'ACTIVES' | 'SENIORS' | 'CUSTOM';
    minAge?: number;
    maxAge?: number;
    description: string;
    active: boolean;
}

interface CustomLicenseTypeItem {
    id: string;
    name: string;
    code: string;
    overType: 'PLAYER' | 'COACH' | 'REFEREE';
    validityDuration: 'SEASON' | 'MONTH_12' | 'DAY_1' | 'TOURNAMENT' | 'CUSTOM_DAYS';
    customDays?: number;
    requiresClub: boolean;
    scope: 'ALL_COMPETITIONS' | 'LEAGUE_ONLY' | 'TOURNAMENT_ONLY';
    requiresRefresherCourse: boolean;
    description?: string;
    active: boolean;
}

const DEFAULT_SPORTS: SportItem[] = [
    { id: 'table_tennis', name: 'Table Tennis', unitNaming: 'Table', active: true, matchFormat: 'BEST_OF_5', pointsPerSet: 11 },
    { id: 'badminton', name: 'Badminton', unitNaming: 'Court', active: false, matchFormat: 'BEST_OF_3', pointsPerSet: 21 },
    { id: 'tennis', name: 'Tennis', unitNaming: 'Court', active: false, matchFormat: 'BEST_OF_3', pointsPerSet: 6 },
    { id: 'squash', name: 'Squash', unitNaming: 'Court', active: false, matchFormat: 'BEST_OF_5', pointsPerSet: 11 },
    { id: 'padel', name: 'Padel', unitNaming: 'Court', active: false, matchFormat: 'BEST_OF_3', pointsPerSet: 6 },
    { id: 'pickleball', name: 'Pickleball', unitNaming: 'Court', active: false, matchFormat: 'BEST_OF_3', pointsPerSet: 11 },
];

const DEFAULT_AGE_SERIES: AgeSeriesItem[] = [
    { id: 'u9', code: 'U9', name: 'Under 9', type: 'YOUTH', maxAge: 9, description: 'Youth athletes aged 8 and under', active: true },
    { id: 'u11', code: 'U11', name: 'Under 11', type: 'YOUTH', minAge: 9, maxAge: 11, description: 'Youth athletes aged 9 to 10', active: true },
    { id: 'u13', code: 'U13', name: 'Under 13', type: 'YOUTH', minAge: 11, maxAge: 13, description: 'Youth athletes aged 11 to 12', active: true },
    { id: 'u15', code: 'U15', name: 'Under 15 / Cadets', type: 'YOUTH', minAge: 13, maxAge: 15, description: 'Cadet athletes aged 13 to 14', active: true },
    { id: 'u18', code: 'U18', name: 'Under 18 / Juniors', type: 'YOUTH', minAge: 15, maxAge: 18, description: 'Junior athletes aged 15 to 17', active: true },
    { id: 'u21', code: 'U21', name: 'Under 21 / Espoirs', type: 'YOUTH', minAge: 18, maxAge: 21, description: 'Espoir athletes aged 18 to 20', active: true },
    { id: 'actives', code: 'ACTIVES', name: 'Actives / Open Division', type: 'ACTIVES', minAge: 18, maxAge: 39, description: 'Standard open adult competition category', active: true },
    { id: 'o40', code: 'O40', name: 'Seniors / Masters 40+', type: 'SENIORS', minAge: 40, maxAge: 49, description: 'Veteran athletes aged 40 and older', active: true },
    { id: 'o50', code: 'O50', name: 'Seniors / Masters 50+', type: 'SENIORS', minAge: 50, maxAge: 59, description: 'Veteran athletes aged 50 and older', active: true },
    { id: 'o60', code: 'O60', name: 'Seniors / Masters 60+', type: 'SENIORS', minAge: 60, maxAge: 69, description: 'Veteran athletes aged 60 and older', active: true },
    { id: 'o70', code: 'O70', name: 'Seniors / Masters 70+', type: 'SENIORS', minAge: 70, maxAge: 79, description: 'Veteran athletes aged 70 and older', active: true },
    { id: 'o80', code: 'O80', name: 'Seniors / Masters 80+', type: 'SENIORS', minAge: 80, description: 'Veteran athletes aged 80 and older', active: true },
];

const DEFAULT_LICENSE_TYPES: CustomLicenseTypeItem[] = [
    {
        id: 'player_regular',
        name: 'Regular Player Season License',
        code: 'PLAYER_REGULAR',
        overType: 'PLAYER',
        validityDuration: 'SEASON',
        requiresClub: true,
        scope: 'ALL_COMPETITIONS',
        requiresRefresherCourse: false,
        description: 'Standard season-long competition license for interclub leagues and open tournaments.',
        active: true,
    },
    {
        id: 'player_tcard',
        name: 'Short-Term Tournament Pass (T-Card)',
        code: 'PLAYER_TCARD',
        overType: 'PLAYER',
        validityDuration: 'TOURNAMENT',
        requiresClub: false,
        scope: 'TOURNAMENT_ONLY',
        requiresRefresherCourse: false,
        description: 'Single-event or tournament pass for guest and recreational participants.',
        active: true,
    },
    {
        id: 'player_women_league',
        name: 'Secondary Club League License (Women Exception)',
        code: 'PLAYER_WOMEN',
        overType: 'PLAYER',
        validityDuration: 'SEASON',
        requiresClub: true,
        scope: 'LEAGUE_ONLY',
        requiresRefresherCourse: false,
        description: 'Dual registration permit allowing female athletes to play in secondary club leagues.',
        active: true,
    },
    {
        id: 'player_junior',
        name: 'Junior Youth License',
        code: 'PLAYER_JUNIOR',
        overType: 'PLAYER',
        validityDuration: 'SEASON',
        requiresClub: true,
        scope: 'ALL_COMPETITIONS',
        requiresRefresherCourse: false,
        description: 'Subsidized season license for youth athletes under U18.',
        active: true,
    },
    {
        id: 'coach_certified',
        name: 'Certified Head Coach License',
        code: 'COACH',
        overType: 'COACH',
        validityDuration: 'MONTH_12',
        requiresClub: true,
        scope: 'ALL_COMPETITIONS',
        requiresRefresherCourse: true,
        description: 'Official federation coaching credential requiring biennial refresher course credits.',
        active: true,
    },
    {
        id: 'referee_official',
        name: 'Official National / Regional Referee',
        code: 'REFEREE',
        overType: 'REFEREE',
        validityDuration: 'MONTH_12',
        requiresClub: false,
        scope: 'ALL_COMPETITIONS',
        requiresRefresherCourse: true,
        description: 'Certified match official credential with mandatory 24-month refresher renewal.',
        active: true,
    },
];

// ==========================================
// COMPONENT IMPLEMENTATION
// ==========================================

export default function AssociationSettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();
    const [topAssoc, setTopAssoc] = useState<any | null>(null);

    // Active Navigation Tab: 8 Sections
    const [activeTab, setActiveTab] = useState<'branding' | 'general' | 'sports' | 'age-series' | 'seasons' | 'licensing' | 'officials' | 'elo-table'>('branding');

    // ----------------------------------------------------
    // SECTION 1: Identity & Branding (Combined with Impressum)
    // ----------------------------------------------------
    const [assocName, setAssocName] = useState('');
    const [assocShortName, setAssocShortName] = useState('');
    const [homepageUrl, setHomepageUrl] = useState('');
    const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
    const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Impressum & Legal Entity Fields
    const [impressumOrgName, setImpressumOrgName] = useState('');
    const [impressumAddress1, setImpressumAddress1] = useState('');
    const [impressumAddress2, setImpressumAddress2] = useState('');
    const [impressumCityPostal, setImpressumCityPostal] = useState('');
    const [impressumCountry, setImpressumCountry] = useState('Switzerland');
    const [impressumUid, setImpressumUid] = useState('');
    const [impressumAffiliation, setImpressumAffiliation] = useState('');
    const [impressumEmail, setImpressumEmail] = useState('');
    const [impressumPhone, setImpressumPhone] = useState('');
    const [impressumWebsite, setImpressumWebsite] = useState('');
    const [impressumPresident, setImpressumPresident] = useState('');
    const [impressumLegalNotes, setImpressumLegalNotes] = useState('');

    // ----------------------------------------------------
    // SECTION 2: General Settings (Phone Calling Codes & Platform Defaults)
    // ----------------------------------------------------
    const [prioritizedCountryCodes, setPrioritizedCountryCodes] = useState<string[]>(DEFAULT_PRIORITIZED_COUNTRIES);
    const [selectedAddCountry, setSelectedAddCountry] = useState<string>('');
    const allCountryOptions = useMemo(() => getAllCountryPhoneOptions(), []);

    // ----------------------------------------------------
    // SECTION 3: Sports & Rules (Multi-sport & Custom Sports)
    // ----------------------------------------------------
    const [sportsList, setSportsList] = useState<SportItem[]>(DEFAULT_SPORTS);

    // General Tournament & Competition Rules
    const [maxForeignersPerTeam, setMaxForeignersPerTeam] = useState(2);
    const [allowTCardDualRegistration, setAllowTCardDualRegistration] = useState(true);
    const [eloKFactor, setEloKFactor] = useState(32);

    // ----------------------------------------------------
    // SECTION 4: Age Series & Divisions
    // ----------------------------------------------------
    const [ageSeries, setAgeSeries] = useState<AgeSeriesItem[]>(DEFAULT_AGE_SERIES);
    const [ageCutoffDate, setAgeCutoffDate] = useState('07-01'); // July 1st cutoff

    // ----------------------------------------------------
    // SECTION 5: Seasons Management
    // ----------------------------------------------------
    const [seasons, setSeasons] = useState<any[]>([]);

    // ----------------------------------------------------
    // SECTION 6: Licensing (Generator, Validity Periods, Custom Types & Re-validation)
    // ----------------------------------------------------
    const [template, setTemplate] = useState('{regionDigit}{year2}{counter3}');
    const [counter, setCounter] = useState(1);
    const [regionDigit, setRegionDigit] = useState(1);

    // License Types & Re-validation rules
    const [licenseTypes, setLicenseTypes] = useState<CustomLicenseTypeItem[]>(DEFAULT_LICENSE_TYPES);

    // Re-validation & Refresher Requirements
    const [requireRefereeCourseForSenior, setRequireRefereeCourseForSenior] = useState(false);
    const [refresherCourseValidityMonths, setRefresherCourseValidityMonths] = useState(24);
    const [expiryWarningDays, setExpiryWarningDays] = useState(60);
    const [refresherGracePeriodMonths, setRefresherGracePeriodMonths] = useState(3);

    // ----------------------------------------------------
    // SECTION 7: Officials & Governance Board
    // ----------------------------------------------------
    const [officials, setOfficials] = useState<OfficialItem[]>([]);
    const [officialsSearch, setOfficialsSearch] = useState('');

    // ----------------------------------------------------
    // SECTION 8: Official ELO Rating Tiers & Level Table
    // ----------------------------------------------------
    const [eloTiers, setEloTiers] = useState<LevelTierDefinition[]>(ELO_TIERS_DATA);
    const [initialProvisionalRating, setInitialProvisionalRating] = useState<number>(1000);

    // General state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const isAuthorized =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) => ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role));

    // Load initial data
    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.getAssociations();
            const top = data.associations?.find((a: any) => a.isTopLevel) || data.associations?.[0];
            if (top) {
                setTopAssoc(top);
                setAssocName(top.name || '');
                setAssocShortName(top.shortName || '');
                setCurrentLogoUrl(top.logoUrl || null);
                setTemplate(top.licenseIdTemplate || '{regionDigit}{year2}{counter3}');
                setCounter(top.licenseCounter || 1);
                setRegionDigit(top.regionDigit || 1);

                // Load rules
                const rules = top.rules || {};
                const imp = rules.impressum || {};

                setHomepageUrl(rules.homepageUrl || imp.website || '');
                setImpressumOrgName(imp.organizationName || top.name || '');
                setImpressumAddress1(imp.addressLine1 || '');
                setImpressumAddress2(imp.addressLine2 || '');
                setImpressumCityPostal(imp.cityPostalCode || '');
                setImpressumCountry(imp.country || 'Switzerland');
                setImpressumUid(imp.uidNumber || '');
                setImpressumAffiliation(imp.affiliation || '');
                setImpressumEmail(imp.email || '');
                setImpressumPhone(imp.phone || '');
                setImpressumWebsite(imp.website || rules.homepageUrl || '');
                setImpressumPresident(imp.presidentName || '');
                setImpressumLegalNotes(imp.customLegalNotes || '');

                if (Array.isArray(rules.prioritizedCountryCodes) && rules.prioritizedCountryCodes.length > 0) {
                    setPrioritizedCountryCodes(rules.prioritizedCountryCodes);
                } else {
                    setPrioritizedCountryCodes(DEFAULT_PRIORITIZED_COUNTRIES);
                }

                if (Array.isArray(rules.sportsList) && rules.sportsList.length > 0) {
                    setSportsList(rules.sportsList);
                }
                if (rules.maxForeignersPerTeam !== undefined) setMaxForeignersPerTeam(rules.maxForeignersPerTeam);
                if (rules.allowTCardDualRegistration !== undefined) setAllowTCardDualRegistration(rules.allowTCardDualRegistration);
                if (rules.eloKFactor !== undefined) setEloKFactor(rules.eloKFactor);

                if (Array.isArray(rules.ageSeries) && rules.ageSeries.length > 0) {
                    setAgeSeries(rules.ageSeries);
                }
                if (rules.ageCutoffDate) {
                    setAgeCutoffDate(rules.ageCutoffDate);
                }

                if (Array.isArray(rules.licenseTypes) && rules.licenseTypes.length > 0) {
                    setLicenseTypes(rules.licenseTypes);
                }
                if (rules.requireRefereeCourseForSenior !== undefined) setRequireRefereeCourseForSenior(rules.requireRefereeCourseForSenior);
                if (rules.refresherCourseValidityMonths !== undefined) setRefresherCourseValidityMonths(rules.refresherCourseValidityMonths);
                if (rules.expiryWarningDays !== undefined) setExpiryWarningDays(rules.expiryWarningDays);
                if (rules.refresherGracePeriodMonths !== undefined) setRefresherGracePeriodMonths(rules.refresherGracePeriodMonths);

                if (Array.isArray(rules.eloTiers) && rules.eloTiers.length > 0) {
                    setEloTiers(rules.eloTiers);
                } else {
                    setEloTiers(ELO_TIERS_DATA);
                }
                if (rules.initialProvisionalRating !== undefined) {
                    setInitialProvisionalRating(rules.initialProvisionalRating);
                }

                // Load seasons & officials
                const [seasonsData, officialsData] = await Promise.all([
                    api.getSeasons(top.id).catch(() => []),
                    api.getOfficials(top.id).catch(() => []),
                ]);
                setSeasons(Array.isArray(seasonsData) ? seasonsData : []);
                setOfficials(Array.isArray(officialsData) ? officialsData : []);
            }
        } catch (err) {
            console.error('Failed to load association settings:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // File selection for Logo
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setErrorMsg('Please select a valid image file (PNG, JPG, SVG, WebP).');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setErrorMsg('Image size cannot exceed 5MB.');
            return;
        }

        setErrorMsg('');
        setSelectedLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    // Save All Settings
    const handleSaveAllSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topAssoc) return;

        setSaving(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            let logoUrlToSave = currentLogoUrl;

            // Upload Logo to S3 if a new file is chosen
            if (selectedLogoFile) {
                setUploadingLogo(true);
                const uploadRes = await api.uploadAssociationLogo(topAssoc.id, selectedLogoFile);
                if (uploadRes && uploadRes.logoUrl) {
                    logoUrlToSave = uploadRes.logoUrl;
                    setCurrentLogoUrl(logoUrlToSave);
                    setSelectedLogoFile(null);
                    setLogoPreviewUrl(null);
                }
                setUploadingLogo(false);
            }

            const updatedRules = {
                ...(topAssoc.rules || {}),
                homepageUrl,
                impressum: {
                    organizationName: impressumOrgName,
                    addressLine1: impressumAddress1,
                    addressLine2: impressumAddress2,
                    cityPostalCode: impressumCityPostal,
                    country: impressumCountry,
                    uidNumber: impressumUid,
                    affiliation: impressumAffiliation,
                    email: impressumEmail,
                    phone: impressumPhone,
                    website: impressumWebsite || homepageUrl,
                    presidentName: impressumPresident,
                    customLegalNotes: impressumLegalNotes,
                },
                prioritizedCountryCodes,
                sportsList,
                maxForeignersPerTeam: Number(maxForeignersPerTeam),
                allowTCardDualRegistration: Boolean(allowTCardDualRegistration),
                eloKFactor: Number(eloKFactor),
                ageSeries,
                ageCutoffDate,
                licenseTypes,
                requireRefereeCourseForSenior: Boolean(requireRefereeCourseForSenior),
                refresherCourseValidityMonths: Number(refresherCourseValidityMonths),
                expiryWarningDays: Number(expiryWarningDays),
                refresherGracePeriodMonths: Number(refresherGracePeriodMonths),
                eloTiers,
                initialProvisionalRating: Number(initialProvisionalRating) || 1000,
            };

            await api.updateAssociationSettings(topAssoc.id, {
                name: assocName,
                shortName: assocShortName,
                logoUrl: logoUrlToSave,
                licenseIdTemplate: template,
                counter: Number(counter),
                regionDigit: Number(regionDigit),
                rules: updatedRules,
            });

            setSuccessMsg('All association settings and configurations saved successfully!');
            setTimeout(() => setSuccessMsg(''), 5000);
            loadData();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to save settings.');
        } finally {
            setSaving(false);
            setUploadingLogo(false);
        }
    };

    // Delete Logo
    const handleDeleteLogo = async () => {
        if (!topAssoc) return;
        const shouldDelete = await confirm({
            title: 'Remove Association Logo',
            message: 'Are you sure you want to remove the current association logo?',
            confirmText: 'Remove Logo',
            variant: 'danger',
        });
        if (!shouldDelete) return;

        setUploadingLogo(true);
        try {
            await api.deleteAssociationLogo(topAssoc.id);
            setCurrentLogoUrl(null);
            setSelectedLogoFile(null);
            setLogoPreviewUrl(null);
            setSuccessMsg('Association logo removed successfully.');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to delete logo.');
        } finally {
            setUploadingLogo(false);
        }
    };

    // Sport handlers
    const toggleSportActive = (id: string) => {
        setSportsList(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
    };

    const handleOpenSportPrompt = async (sportToEdit?: SportItem) => {
        const res = await prompt({
            title: sportToEdit ? 'Edit Sport Configuration' : 'Add Custom Sport',
            subtitle: 'Configure sport rules and playing unit terminology',
            fields: [
                {
                    name: 'name',
                    label: 'Sport Discipline Name',
                    type: 'text',
                    required: true,
                    placeholder: 'e.g. Pickleball, Billiards, Pétanque, Squash',
                    defaultValue: sportToEdit?.name || '',
                },
                {
                    name: 'unitNaming',
                    label: 'Playing Unit Terminology',
                    type: 'text',
                    required: true,
                    placeholder: 'e.g. Court, Table, Pitch, Lane, Board, Terrain',
                    defaultValue: sportToEdit?.unitNaming || 'Court',
                },
                {
                    name: 'matchFormat',
                    label: 'Default Match Format',
                    type: 'select',
                    required: true,
                    defaultValue: sportToEdit?.matchFormat || 'BEST_OF_5',
                    options: [
                        { label: 'Best of 3 Sets', value: 'BEST_OF_3' },
                        { label: 'Best of 5 Sets', value: 'BEST_OF_5' },
                        { label: 'Best of 7 Sets', value: 'BEST_OF_7' },
                    ],
                },
                {
                    name: 'pointsPerSet',
                    label: 'Points per Set / Frame',
                    type: 'number',
                    required: true,
                    min: 1,
                    max: 100,
                    defaultValue: sportToEdit?.pointsPerSet || 11,
                },
            ],
            confirmText: sportToEdit ? 'Save Sport' : 'Add Sport',
        });

        if (!res || !res.name?.trim() || !res.unitNaming?.trim()) return;

        if (sportToEdit) {
            setSportsList(prev => prev.map(s => s.id === sportToEdit.id ? {
                ...s,
                name: res.name.trim(),
                unitNaming: res.unitNaming.trim(),
                matchFormat: res.matchFormat,
                pointsPerSet: Number(res.pointsPerSet) || 11,
            } : s));
        } else {
            const newSport: SportItem = {
                id: `custom_${Date.now()}`,
                name: res.name.trim(),
                unitNaming: res.unitNaming.trim(),
                isCustom: true,
                active: true,
                matchFormat: res.matchFormat,
                pointsPerSet: Number(res.pointsPerSet) || 11,
            };
            setSportsList(prev => [...prev, newSport]);
        }
    };

    const handleDeleteSport = async (id: string) => {
        const sportToDelete = sportsList.find(s => s.id === id);
        const shouldDelete = await confirm({
            title: 'Delete Custom Sport',
            message: `Are you sure you want to remove "${sportToDelete?.name || 'this sport'}" from the federation sports list?`,
            confirmText: 'Delete Sport',
            variant: 'danger',
        });
        if (!shouldDelete) return;
        setSportsList(prev => prev.filter(s => s.id !== id));
    };

    // Age Series handlers
    const toggleAgeActive = (id: string) => {
        setAgeSeries(prev => prev.map(item => item.id === id ? { ...item, active: !item.active } : item));
    };

    const handleOpenAgeSeriesPrompt = async (itemToEdit?: AgeSeriesItem) => {
        const res = await prompt({
            title: itemToEdit ? 'Edit Age Category' : 'Add Age Category',
            subtitle: 'Configure age bracket specifications and classification',
            fields: [
                {
                    name: 'code',
                    label: 'Series Code',
                    type: 'text',
                    required: true,
                    placeholder: 'e.g. U10, O35, ELITE',
                    defaultValue: itemToEdit?.code || '',
                },
                {
                    name: 'name',
                    label: 'Category Name',
                    type: 'text',
                    required: true,
                    placeholder: 'e.g. Under 10 Juniors, Masters 35+',
                    defaultValue: itemToEdit?.name || '',
                },
                {
                    name: 'type',
                    label: 'Division Type',
                    type: 'select',
                    required: true,
                    defaultValue: itemToEdit?.type || 'YOUTH',
                    options: [
                        { label: 'Youth', value: 'YOUTH' },
                        { label: 'Actives', value: 'ACTIVES' },
                        { label: 'Seniors', value: 'SENIORS' },
                        { label: 'Custom', value: 'CUSTOM' },
                    ],
                },
                {
                    name: 'minAge',
                    label: 'Min Age (optional)',
                    type: 'number',
                    placeholder: 'Optional',
                    defaultValue: itemToEdit?.minAge ?? '',
                    min: 0,
                    max: 120,
                },
                {
                    name: 'maxAge',
                    label: 'Max Age (optional)',
                    type: 'number',
                    placeholder: 'Optional',
                    defaultValue: itemToEdit?.maxAge ?? '',
                    min: 0,
                    max: 120,
                },
                {
                    name: 'description',
                    label: 'Description / Guidelines',
                    type: 'textarea',
                    placeholder: 'Description of the category...',
                    defaultValue: itemToEdit?.description || '',
                },
            ],
            confirmText: itemToEdit ? 'Save Category' : 'Add Category',
        });

        if (!res || !res.code?.trim() || !res.name?.trim()) return;

        if (itemToEdit) {
            setAgeSeries(prev => prev.map(item => item.id === itemToEdit.id ? {
                ...item,
                code: res.code.trim().toUpperCase(),
                name: res.name.trim(),
                type: res.type,
                minAge: res.minAge !== '' && res.minAge !== undefined ? Number(res.minAge) : undefined,
                maxAge: res.maxAge !== '' && res.maxAge !== undefined ? Number(res.maxAge) : undefined,
                description: res.description?.trim() || '',
            } : item));
        } else {
            const newItem: AgeSeriesItem = {
                id: `custom_${Date.now()}`,
                code: res.code.trim().toUpperCase(),
                name: res.name.trim(),
                type: res.type,
                minAge: res.minAge !== '' && res.minAge !== undefined ? Number(res.minAge) : undefined,
                maxAge: res.maxAge !== '' && res.maxAge !== undefined ? Number(res.maxAge) : undefined,
                description: res.description?.trim() || '',
                active: true,
            };
            setAgeSeries(prev => [...prev, newItem]);
        }
    };

    const handleDeleteAgeSeries = async (id: string) => {
        const itemToDelete = ageSeries.find(i => i.id === id);
        const shouldDelete = await confirm({
            title: 'Delete Age Category',
            message: `Are you sure you want to remove "${itemToDelete?.name || 'this category'}"?`,
            confirmText: 'Delete Category',
            variant: 'danger',
        });
        if (!shouldDelete) return;
        setAgeSeries(prev => prev.filter(item => item.id !== id));
    };

    // License Type handlers
    const toggleLicenseTypeActive = (id: string) => {
        setLicenseTypes(prev => prev.map(lt => lt.id === id ? { ...lt, active: !lt.active } : lt));
    };

    const handleOpenLicenseTypePrompt = async (licToEdit?: CustomLicenseTypeItem) => {
        const res = await prompt({
            title: licToEdit ? 'Edit License Type' : 'Create Custom License Type',
            subtitle: 'Configure specialized license under one of the 3 master over-types',
            fields: [
                {
                    name: 'name',
                    label: 'License Name',
                    type: 'text',
                    required: true,
                    placeholder: 'e.g. Recreational League Pass, T-Card Guest',
                    defaultValue: licToEdit?.name || '',
                },
                {
                    name: 'code',
                    label: 'Code / Identifier',
                    type: 'text',
                    required: true,
                    placeholder: 'e.g. REC_LEAGUE, TCARD_GUEST',
                    defaultValue: licToEdit?.code || '',
                },
                {
                    name: 'overType',
                    label: 'Master Over-Type (Fixed)',
                    type: 'select',
                    required: true,
                    defaultValue: licToEdit?.overType || 'PLAYER',
                    options: [
                        { label: 'PLAYER (Athlete Pass)', value: 'PLAYER' },
                        { label: 'COACH (Instructor Credential)', value: 'COACH' },
                        { label: 'REFEREE (Official & Umpire)', value: 'REFEREE' },
                    ],
                },
                {
                    name: 'validityDuration',
                    label: 'Validity Duration',
                    type: 'select',
                    required: true,
                    defaultValue: licToEdit?.validityDuration || 'SEASON',
                    options: [
                        { label: 'Full Sporting Season', value: 'SEASON' },
                        { label: '12 Months from Issue', value: 'MONTH_12' },
                        { label: 'Single Day (1 Day)', value: 'DAY_1' },
                        { label: 'Specific Tournament Duration', value: 'TOURNAMENT' },
                        { label: 'Custom Number of Days', value: 'CUSTOM_DAYS' },
                    ],
                },
                {
                    name: 'customDays',
                    label: 'Custom Validity in Days (if Custom Days selected)',
                    type: 'number',
                    defaultValue: licToEdit?.customDays || 30,
                    min: 1,
                    max: 365,
                },
                {
                    name: 'scope',
                    label: 'Competition Scope',
                    type: 'select',
                    required: true,
                    defaultValue: licToEdit?.scope || 'ALL_COMPETITIONS',
                    options: [
                        { label: 'All Competitions & Leagues', value: 'ALL_COMPETITIONS' },
                        { label: 'League Encounters Only', value: 'LEAGUE_ONLY' },
                        { label: 'Tournaments & Open Cups Only', value: 'TOURNAMENT_ONLY' },
                    ],
                },
                {
                    name: 'requiresClub',
                    label: 'Requires Active Club Affiliation',
                    type: 'checkbox',
                    defaultValue: licToEdit ? licToEdit.requiresClub : true,
                },
                {
                    name: 'requiresRefresherCourse',
                    label: 'Requires Refresher Course for Re-Validation',
                    type: 'checkbox',
                    defaultValue: licToEdit ? licToEdit.requiresRefresherCourse : false,
                },
                {
                    name: 'description',
                    label: 'Description & Guidelines',
                    type: 'textarea',
                    placeholder: 'Purpose, target athletes or officials, and eligibility notes...',
                    defaultValue: licToEdit?.description || '',
                },
            ],
            confirmText: licToEdit ? 'Save License Type' : 'Create License Type',
            size: 'lg',
        });

        if (!res || !res.name?.trim() || !res.code?.trim()) return;

        if (licToEdit) {
            setLicenseTypes(prev => prev.map(lt => lt.id === licToEdit.id ? {
                ...lt,
                name: res.name.trim(),
                code: res.code.trim().toUpperCase(),
                overType: res.overType,
                validityDuration: res.validityDuration,
                customDays: res.validityDuration === 'CUSTOM_DAYS' ? Number(res.customDays) || 30 : undefined,
                requiresClub: Boolean(res.requiresClub),
                scope: res.scope,
                requiresRefresherCourse: Boolean(res.requiresRefresherCourse),
                description: res.description?.trim() || '',
            } : lt));
        } else {
            const newLicType: CustomLicenseTypeItem = {
                id: `custom_lic_${Date.now()}`,
                name: res.name.trim(),
                code: res.code.trim().toUpperCase(),
                overType: res.overType,
                validityDuration: res.validityDuration,
                customDays: res.validityDuration === 'CUSTOM_DAYS' ? Number(res.customDays) || 30 : undefined,
                requiresClub: Boolean(res.requiresClub),
                scope: res.scope,
                requiresRefresherCourse: Boolean(res.requiresRefresherCourse),
                description: res.description?.trim() || '',
                active: true,
            };
            setLicenseTypes(prev => [...prev, newLicType]);
        }
    };

    const handleDeleteLicenseType = async (id: string) => {
        const licToDelete = licenseTypes.find(l => l.id === id);
        const shouldDelete = await confirm({
            title: 'Delete License Type',
            message: `Are you sure you want to delete "${licToDelete?.name || 'this license type'}"?`,
            confirmText: 'Delete License Type',
            variant: 'danger',
        });
        if (!shouldDelete) return;
        setLicenseTypes(prev => prev.filter(lt => lt.id !== id));
    };

    // Seasons handlers
    const handleOpenSeasonPrompt = async () => {
        if (!topAssoc) return;
        const currentYear = new Date().getFullYear();
        const res = await prompt({
            title: 'Create New Season',
            subtitle: 'Register an official competition period for this federation',
            fields: [
                {
                    name: 'name',
                    label: 'Season Name',
                    type: 'text',
                    required: true,
                    placeholder: `e.g. Season ${currentYear}/${currentYear + 1}`,
                    defaultValue: `Season ${currentYear}/${currentYear + 1}`,
                },
                {
                    name: 'startDate',
                    label: 'Start Date',
                    type: 'date',
                    required: true,
                    defaultValue: `${currentYear}-08-01`,
                },
                {
                    name: 'endDate',
                    label: 'End Date',
                    type: 'date',
                    required: true,
                    defaultValue: `${currentYear + 1}-06-30`,
                },
                {
                    name: 'isCurrent',
                    label: 'Set immediately as active current season',
                    type: 'checkbox',
                    defaultValue: false,
                },
            ],
            confirmText: 'Create Season',
        });

        if (!res || !res.name?.trim() || !res.startDate || !res.endDate) return;

        setErrorMsg('');
        try {
            await api.createSeason(topAssoc.id, {
                name: res.name.trim(),
                startDate: new Date(res.startDate).toISOString(),
                endDate: new Date(res.endDate).toISOString(),
                isCurrent: Boolean(res.isCurrent),
            });
            setSuccessMsg('New season created successfully!');
            setTimeout(() => setSuccessMsg(''), 4000);
            loadData();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to create season.');
        }
    };

    const handleToggleSeasonActive = async (seasonId: string, isCurrent: boolean) => {
        if (!topAssoc) return;
        try {
            await api.setCurrentSeason(topAssoc.id, seasonId, isCurrent);
            setSuccessMsg(isCurrent ? 'Season activated successfully.' : 'Season deactivated successfully.');
            setTimeout(() => setSuccessMsg(''), 4000);
            loadData();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to update season active status.');
        }
    };

    const handleDeleteSeason = async (seasonId: string) => {
        if (!topAssoc) return;
        const seasonToDelete = seasons.find(s => s.id === seasonId);
        const shouldDelete = await confirm({
            title: 'Delete Season',
            message: `Are you sure you want to delete season "${seasonToDelete?.name || 'selected season'}"?`,
            confirmText: 'Delete Season',
            variant: 'danger',
        });
        if (!shouldDelete) return;

        try {
            await api.deleteSeason(topAssoc.id, seasonId);
            setSuccessMsg('Season deleted successfully.');
            setTimeout(() => setSuccessMsg(''), 4000);
            loadData();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to delete season.');
        }
    };

    // Officials & Governance Handlers
    const handleOpenAddOfficialPrompt = async () => {
        if (!topAssoc) return;
        const res = await prompt({
            title: 'Assign Association Official',
            subtitle: 'Assign a registered member to an official governance role in this federation',
            fields: [
                {
                    name: 'userIdentifier',
                    label: 'User Email, License ID, or User ID',
                    type: 'text',
                    required: true,
                    placeholder: 'e.g. name@federation.org, 102450, or user UUID',
                },
                {
                    name: 'role',
                    label: 'Governance Role / Position',
                    type: 'select',
                    required: true,
                    defaultValue: 'MEMBER',
                    options: OFFICIAL_ROLES.map(r => ({ label: `${r.label} (${r.value})`, value: r.value })),
                },
            ],
            confirmText: 'Assign Official',
        });

        if (!res || !res.userIdentifier?.trim() || !res.role) return;

        setErrorMsg('');
        try {
            const newOfficial = await api.addOfficial(topAssoc.id, {
                userIdentifier: res.userIdentifier.trim(),
                role: res.role,
            });
            setOfficials(prev => [...prev, newOfficial]);
            setSuccessMsg(`Assigned ${newOfficial.user?.firstName || 'user'} ${newOfficial.user?.lastName || ''} as ${res.role}`);
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to assign official');
            setTimeout(() => setErrorMsg(''), 6000);
        }
    };

    const handleOpenEditOfficialPrompt = async (official: OfficialItem) => {
        if (!topAssoc) return;
        const res = await prompt({
            title: 'Update Official Role',
            subtitle: `Change governance position for ${official.user.firstName} ${official.user.lastName}`,
            fields: [
                {
                    name: 'role',
                    label: 'Assigned Role',
                    type: 'select',
                    required: true,
                    defaultValue: official.role,
                    options: OFFICIAL_ROLES.map(r => ({ label: `${r.label} (${r.value})`, value: r.value })),
                },
            ],
            confirmText: 'Update Role',
        });

        if (!res || !res.role || res.role === official.role) return;

        setErrorMsg('');
        try {
            const updated = await api.updateOfficial(topAssoc.id, official.id, {
                role: res.role,
            });
            setOfficials(prev => prev.map(o => o.id === official.id ? updated : o));
            setSuccessMsg(`Updated role for ${official.user.firstName} ${official.user.lastName} to ${res.role}`);
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to update official role');
            setTimeout(() => setErrorMsg(''), 6000);
        }
    };

    const handleRemoveOfficial = async (official: OfficialItem) => {
        if (!topAssoc) return;
        const shouldDelete = await confirm({
            title: 'Remove Official',
            message: `Are you sure you want to remove "${official.user.firstName} ${official.user.lastName}" from their position as "${official.role}"?`,
            confirmText: 'Remove Official',
            variant: 'danger',
        });
        if (!shouldDelete) return;

        setErrorMsg('');
        try {
            await api.removeOfficial(topAssoc.id, official.id);
            setOfficials(prev => prev.filter(o => o.id !== official.id));
            setSuccessMsg(`Removed ${official.user.firstName} ${official.user.lastName} from officials`);
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to remove official');
            setTimeout(() => setErrorMsg(''), 6000);
        }
    };

    const filteredOfficials = useMemo(() => {
        if (!officialsSearch.trim()) return officials;
        const q = officialsSearch.toLowerCase().trim();
        return officials.filter(o =>
            `${o.user.firstName} ${o.user.lastName}`.toLowerCase().includes(q) ||
            o.role.toLowerCase().includes(q) ||
            (o.user.email && o.user.email.toLowerCase().includes(q)) ||
            (o.user.licenseId && o.user.licenseId.toLowerCase().includes(q))
        );
    }, [officials, officialsSearch]);

    const getRoleBadge = (role: string) => {
        switch (role.toUpperCase()) {
            case 'ADMIN':
                return {
                    label: 'System Admin',
                    className: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900',
                };
            case 'PRESIDENT':
                return {
                    label: 'President',
                    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900',
                };
            case 'VICE_PRESIDENT':
                return {
                    label: 'Vice President',
                    className: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-900',
                };
            case 'SECRETARY':
                return {
                    label: 'General Secretary',
                    className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900',
                };
            case 'TREASURER':
                return {
                    label: 'Treasurer / Finance',
                    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
                };
            case 'REFEREE_HEAD':
                return {
                    label: 'Head of Match Officials',
                    className: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-900',
                };
            case 'COACH_HEAD':
                return {
                    label: 'Head of Coaching',
                    className: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
                };
            case 'COMMUNICATIONS':
                return {
                    label: 'Media & PR',
                    className: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900',
                };
            default:
                return {
                    label: role,
                    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
                };
        }
    };

    // Preview Generator for License ID Engine
    const previewId = (() => {
        const year = new Date().getFullYear();
        const year4 = String(year);
        const year2 = year4.slice(-2);
        const pad = (n: number, len: number) => String(n).padStart(len, '0');

        return template
            .replace('{year4}', year4)
            .replace('{year2}', year2)
            .replace('{regionDigit}', String(regionDigit))
            .replace('{counter3}', pad(counter, 3))
            .replace('{counter4}', pad(counter, 4))
            .replace('{counter5}', pad(counter, 5))
            .replace('{counter6}', pad(counter, 6));
    })();

    // ----------------------------------------------------
    // ELO Tiers & Rating Table Handlers
    // ----------------------------------------------------
    const handleOpenAddTierPrompt = async () => {
        const res = await prompt({
            title: 'Add ELO Rating Tier / Rank Level',
            subtitle: 'Define a new skill classification tier and Elo range for the national rating system',
            fields: [
                {
                    name: 'category',
                    label: 'Category / Division Title *',
                    type: 'text',
                    required: true,
                    placeholder: 'e.g. A - National Elite, B - Expert, C - Advanced Regional, D - Intermediate',
                    defaultValue: 'C - Advanced Regional',
                },
                {
                    name: 'level',
                    label: 'Rank Level Code *',
                    type: 'text',
                    required: true,
                    placeholder: 'e.g. C11, B16, A21, E1',
                },
                {
                    name: 'minElo',
                    label: 'Minimum Elo Rating *',
                    type: 'number',
                    required: true,
                    min: 0,
                    max: 5000,
                    defaultValue: 1000,
                },
                {
                    name: 'maxElo',
                    label: 'Maximum Elo Rating *',
                    type: 'number',
                    required: true,
                    min: 0,
                    max: 5000,
                    defaultValue: 1099,
                },
                {
                    name: 'leagueEligibility',
                    label: 'League Eligibility Benchmark',
                    type: 'text',
                    placeholder: 'e.g. 4th / 5th League, NLA, Open Days',
                    defaultValue: 'Regional League',
                },
                {
                    name: 'description',
                    label: 'Description & Skill Profile',
                    type: 'textarea',
                    placeholder: 'Target skill profile, competitive qualifications, or description...',
                    defaultValue: '',
                },
            ],
            confirmText: 'Add Rank Level',
            size: 'lg',
        });

        if (!res || !res.level?.trim() || res.minElo === undefined || res.maxElo === undefined) return;

        const minElo = Number(res.minElo);
        const maxElo = Number(res.maxElo);
        const levelCode = res.level.trim().toUpperCase();

        const newTier: LevelTierDefinition = {
            id: `tier_${Date.now()}`,
            order: eloTiers.length + 1,
            category: res.category?.trim() || 'Custom Category',
            level: levelCode,
            minElo,
            maxElo,
            leagueEligibility: res.leagueEligibility?.trim() || 'Open Competition',
            description: res.description?.trim() || 'Federation classified ranking tier',
        };

        setEloTiers(prev => {
            const updated = [...prev.filter(t => t.level.toUpperCase() !== levelCode), newTier];
            return updated.sort((a, b) => b.minElo - a.minElo).map((t, idx) => ({ ...t, order: idx + 1 }));
        });
    };

    const handleOpenEditTierPrompt = async (tierToEdit: LevelTierDefinition) => {
        const res = await prompt({
            title: `Edit Rank Level ${tierToEdit.level}`,
            subtitle: 'Update category classification, Elo range boundaries, or eligibility text',
            fields: [
                {
                    name: 'category',
                    label: 'Category / Division Title *',
                    type: 'text',
                    required: true,
                    defaultValue: tierToEdit.category,
                },
                {
                    name: 'level',
                    label: 'Rank Level Code *',
                    type: 'text',
                    required: true,
                    defaultValue: tierToEdit.level,
                },
                {
                    name: 'minElo',
                    label: 'Minimum Elo Rating *',
                    type: 'number',
                    required: true,
                    min: 0,
                    max: 5000,
                    defaultValue: tierToEdit.minElo,
                },
                {
                    name: 'maxElo',
                    label: 'Maximum Elo Rating *',
                    type: 'number',
                    required: true,
                    min: 0,
                    max: 5000,
                    defaultValue: tierToEdit.maxElo,
                },
                {
                    name: 'leagueEligibility',
                    label: 'League Eligibility Benchmark',
                    type: 'text',
                    defaultValue: tierToEdit.leagueEligibility || '',
                },
                {
                    name: 'description',
                    label: 'Description & Skill Profile',
                    type: 'textarea',
                    defaultValue: tierToEdit.description || '',
                },
            ],
            confirmText: 'Save Rank Level',
            size: 'lg',
        });

        if (!res || !res.level?.trim() || res.minElo === undefined || res.maxElo === undefined) return;

        const minElo = Number(res.minElo);
        const maxElo = Number(res.maxElo);
        const levelCode = res.level.trim().toUpperCase();

        const updatedTier: LevelTierDefinition = {
            ...tierToEdit,
            category: res.category?.trim() || tierToEdit.category,
            level: levelCode,
            minElo,
            maxElo,
            leagueEligibility: res.leagueEligibility?.trim() || '',
            description: res.description?.trim() || '',
        };

        setEloTiers(prev => {
            return prev.map(t => (t.id === tierToEdit.id || t.level === tierToEdit.level) ? updatedTier : t);
        });
    };

    const handleMoveTierUp = (index: number) => {
        if (index <= 0) return;
        setEloTiers(prev => {
            const next = [...prev];
            const item = next[index];
            next[index] = next[index - 1];
            next[index - 1] = item;
            return next.map((t, idx) => ({ ...t, order: idx + 1 }));
        });
    };

    const handleMoveTierDown = (index: number) => {
        if (index >= eloTiers.length - 1) return;
        setEloTiers(prev => {
            const next = [...prev];
            const item = next[index];
            next[index] = next[index + 1];
            next[index + 1] = item;
            return next.map((t, idx) => ({ ...t, order: idx + 1 }));
        });
    };

    const handleSortTiersByElo = (descending: boolean = true) => {
        setEloTiers(prev => {
            const sorted = [...prev].sort((a, b) => descending ? b.minElo - a.minElo : a.minElo - b.minElo);
            return sorted.map((t, idx) => ({ ...t, order: idx + 1 }));
        });
    };

    const handleDeleteTier = async (tierToDelete: LevelTierDefinition) => {
        const shouldDelete = await confirm({
            title: `Delete Level ${tierToDelete.level}`,
            message: `Are you sure you want to remove tier "${tierToDelete.level}" (${tierToDelete.minElo} - ${tierToDelete.maxElo === 3000 ? '∞' : tierToDelete.maxElo} Elo)?`,
            confirmText: 'Delete Tier',
            variant: 'danger',
        });
        if (!shouldDelete) return;

        setEloTiers(prev => prev.filter(t => t.id !== tierToDelete.id && t.level !== tierToDelete.level).map((t, idx) => ({ ...t, order: idx + 1 })));
    };

    const handleResetTiersToDefault = async () => {
        const shouldReset = await confirm({
            title: 'Reset to Swiss Federation Defaults',
            message: 'Are you sure you want to reset all Elo tiers back to the standard Swiss Table Tennis table (A20–A16, B15–B11, C10–C6, D5–D1)? Any custom tiers will be replaced.',
            confirmText: 'Reset Defaults',
            variant: 'danger',
        });
        if (!shouldReset) return;

        setEloTiers(ELO_TIERS_DATA);
        setSuccessMsg('ELO tiers reset to official federation defaults. Remember to click "Save All Settings".');
        setTimeout(() => setSuccessMsg(''), 4000);
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                    <p className="text-xs text-slate-500">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return <AccessDenied />;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                    <p className="text-xs text-slate-500">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-16">
            {/* Top Navigation Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Sliders className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {topAssoc?.name || 'Association Settings'}
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Configure organization identity & impressum, sports & rules, age brackets, seasons, and licensing engine.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleSaveAllSettings}
                        disabled={saving || uploadingLogo}
                        className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 text-xs font-bold shadow-sm transition disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        <span>{saving ? t('common.saving') : t('common.save')}</span>
                    </button>
                </div>
            </div>

            {/* Notification Alerts */}
            {successMsg && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>{successMsg}</div>
                </div>
            )}

            {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/80 dark:text-red-300 animate-in fade-in">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>{errorMsg}</div>
                </div>
            )}

            {/* 6 SECTION TABS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
                {/* 1. Identity & Branding */}
                <button
                    type="button"
                    onClick={() => setActiveTab('branding')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'branding'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Building2 className="h-4 w-4" />
                    <span>Identity & Branding</span>
                </button>

                {/* 2. General Settings */}
                <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'general'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Phone className="h-4 w-4" />
                    <span>General Settings</span>
                </button>

                {/* 3. Sports & Rules */}
                <button
                    type="button"
                    onClick={() => setActiveTab('sports')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'sports'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Trophy className="h-4 w-4" />
                    <span>Sports & Rules</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {sportsList.filter(s => s.active).length}
                    </span>
                </button>

                {/* 4. Age Series */}
                <button
                    type="button"
                    onClick={() => setActiveTab('age-series')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'age-series'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Users className="h-4 w-4" />
                    <span>Age Series</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {ageSeries.filter(a => a.active).length}
                    </span>
                </button>

                {/* 5. Seasons */}
                <button
                    type="button"
                    onClick={() => setActiveTab('seasons')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'seasons'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Calendar className="h-4 w-4" />
                    <span>Seasons</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {seasons.length}
                    </span>
                </button>

                {/* 6. Licensing */}
                <button
                    type="button"
                    onClick={() => setActiveTab('licensing')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'licensing'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Key className="h-4 w-4" />
                    <span>Licensing</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {licenseTypes.filter(l => l.active).length}
                    </span>
                </button>

                {/* 7. Officials */}
                <button
                    type="button"
                    onClick={() => setActiveTab('officials')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'officials'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <UserCheck className="h-4 w-4" />
                    <span>Officials</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {officials.length}
                    </span>
                </button>

                {/* 8. ELO & Level Table */}
                <button
                    type="button"
                    onClick={() => setActiveTab('elo-table')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'elo-table'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <TableIcon className="h-4 w-4" />
                    <span>ELO & Level Table</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {eloTiers.length}
                    </span>
                </button>
            </div>

            {/* ======================================================== */}
            {/* SECTION 1: IDENTITY, BRANDING & IMPRESSUM                */}
            {/* ======================================================== */}
            {activeTab === 'branding' && (
                <div className="space-y-6">
                    {/* Organization Identity & Homepage URL */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-amber-500" />
                                <span>Federation Identity & Homepage URL</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Official organization branding, public acronym, and direct link to the federation homepage.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Official Association Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={assocName}
                                    onChange={(e) => setAssocName(e.target.value)}
                                    placeholder="e.g. Swiss Table Tennis"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Short Name / Acronym *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={assocShortName}
                                    onChange={(e) => setAssocShortName(e.target.value)}
                                    placeholder="e.g. STT"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Link to Association Homepage URL *
                                </label>
                                <div className="relative">
                                    <Globe className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                                    <input
                                        type="url"
                                        value={homepageUrl}
                                        onChange={(e) => {
                                            setHomepageUrl(e.target.value);
                                            setImpressumWebsite(e.target.value);
                                        }}
                                        placeholder="https://www.swisstabletennis.ch"
                                        className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    This URL is linked across navigation headers, official impressum, and tournament exports.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Logo & Emblem S3 Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ImageIcon className="h-5 w-5 text-amber-500" />
                                <span>Official Logo & S3 Media Storage</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Upload the federation emblem for official player license passes, PDF diplomas, and tournament branding.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                            <div className="relative h-28 w-28 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                                {logoPreviewUrl || currentLogoUrl ? (
                                    <img
                                        src={logoPreviewUrl || currentLogoUrl!}
                                        alt="Association Logo"
                                        className="h-full w-full object-contain p-2"
                                    />
                                ) : (
                                    <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                                )}
                            </div>

                            <div className="space-y-3 flex-1 text-center sm:text-left">
                                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Recommended: Square or transparent PNG / SVG emblem (Max 5MB)
                                </div>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition shadow-xs"
                                    >
                                        <Upload className="h-3.5 w-3.5" />
                                        <span>Choose Logo</span>
                                    </button>

                                    {(currentLogoUrl || logoPreviewUrl) && (
                                        <button
                                            type="button"
                                            onClick={handleDeleteLogo}
                                            disabled={uploadingLogo}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 text-xs font-semibold transition"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span>Remove Logo</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Impressum & Legal Headquarters */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="h-5 w-5 text-amber-500" />
                                <span>Impressum, Legal Headquarters & Governance</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Legal company details, physical headquarters, commercial UID, official contact, and board leadership.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Legal Entity Name
                                </label>
                                <input
                                    type="text"
                                    value={impressumOrgName}
                                    onChange={(e) => setImpressumOrgName(e.target.value)}
                                    placeholder="e.g. Swiss Table Tennis (STT)"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Commercial UID / Company Register
                                </label>
                                <input
                                    type="text"
                                    value={impressumUid}
                                    onChange={(e) => setImpressumUid(e.target.value)}
                                    placeholder="e.g. CHE-107.822.451"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Street Address (Line 1)
                                </label>
                                <input
                                    type="text"
                                    value={impressumAddress1}
                                    onChange={(e) => setImpressumAddress1(e.target.value)}
                                    placeholder="e.g. Haus des Sports, Talgut-Zentrum 27"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Additional Address Line 2 (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={impressumAddress2}
                                    onChange={(e) => setImpressumAddress2(e.target.value)}
                                    placeholder="e.g. Postfach / Suite 300"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Postal Code & City
                                </label>
                                <input
                                    type="text"
                                    value={impressumCityPostal}
                                    onChange={(e) => setImpressumCityPostal(e.target.value)}
                                    placeholder="e.g. CH-3063 Ittigen / Bern"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Country
                                </label>
                                <input
                                    type="text"
                                    value={impressumCountry}
                                    onChange={(e) => setImpressumCountry(e.target.value)}
                                    placeholder="e.g. Switzerland"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Official Contact Email
                                </label>
                                <input
                                    type="email"
                                    value={impressumEmail}
                                    onChange={(e) => setImpressumEmail(e.target.value)}
                                    placeholder="info@swisstabletennis.ch"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Official Telephone Number
                                </label>
                                <input
                                    type="text"
                                    value={impressumPhone}
                                    onChange={(e) => setImpressumPhone(e.target.value)}
                                    placeholder="+41 (0)31 359 73 90"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    President / Executive Representative
                                </label>
                                <input
                                    type="text"
                                    value={impressumPresident}
                                    onChange={(e) => setImpressumPresident(e.target.value)}
                                    placeholder="e.g. Freddy Falck, President"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Governance Subtitle / Motto
                                </label>
                                <input
                                    type="text"
                                    value={impressumLegalNotes}
                                    onChange={(e) => setImpressumLegalNotes(e.target.value)}
                                    placeholder="e.g. Official Sports Platform Governance & Federation Administration"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Olympic & Federation Affiliations
                                </label>
                                <input
                                    type="text"
                                    value={impressumAffiliation}
                                    onChange={(e) => setImpressumAffiliation(e.target.value)}
                                    placeholder="e.g. Swiss Olympic Member • ITTF • ETTU"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* SECTION 2: GENERAL SETTINGS                              */}
            {/* ======================================================== */}
            {activeTab === 'general' && (
                <div className="space-y-6">
                    {/* Phone Calling Code Priorities Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Phone className="h-5 w-5 text-amber-500" />
                                    <span>Prioritized Phone Calling Codes</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Define the preferred countries that appear at the top of phone number dropdowns across all registration and member forms.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPrioritizedCountryCodes(DEFAULT_PRIORITIZED_COUNTRIES)}
                                className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                            >
                                Reset to Default European Codes
                            </button>
                        </div>

                        {/* List of currently prioritized countries */}
                        <div className="space-y-3">
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Currently Priority Ranked Countries ({prioritizedCountryCodes.length})
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {prioritizedCountryCodes.map((code, idx) => {
                                    const opt = allCountryOptions.find((c) => c.code === code);
                                    return (
                                        <div
                                            key={code}
                                            className="inline-flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white shadow-2xs font-medium"
                                        >
                                            <span className="text-[10px] font-mono text-slate-400 font-bold">
                                                #{idx + 1}
                                            </span>
                                            <FlagIcon code={code} className="w-4.5 h-3 rounded-[2px]" />
                                            <span>{opt?.name || code}</span>
                                            <span className="font-mono text-[11px] text-slate-400">
                                                ({opt?.callingCode})
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPrioritizedCountryCodes((prev) =>
                                                        prev.filter((c) => c !== code)
                                                    )
                                                }
                                                className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                                                title="Remove from priority"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Add Country to Priority List */}
                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex-1 min-w-[220px] max-w-sm">
                                <select
                                    value={selectedAddCountry}
                                    onChange={(e) => setSelectedAddCountry(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none font-medium"
                                >
                                    <option value="">Select a country to add to priority...</option>
                                    {allCountryOptions
                                        .filter((c) => !prioritizedCountryCodes.includes(c.code))
                                        .map((c) => (
                                            <option key={c.code} value={c.code}>
                                                {c.name} ({c.callingCode})
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                disabled={!selectedAddCountry}
                                onClick={() => {
                                    if (selectedAddCountry && !prioritizedCountryCodes.includes(selectedAddCountry)) {
                                        setPrioritizedCountryCodes((prev) => [...prev, selectedAddCountry]);
                                        setSelectedAddCountry('');
                                    }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2 text-xs font-bold transition shadow-xs"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add to Priority</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* SECTION 3: SPORTS & RULES                                */}
            {/* ======================================================== */}
            {activeTab === 'sports' && (
                <div className="space-y-6">
                    {/* Multi-Sport Governance & Custom Sport Creation */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-amber-500" />
                                    <span>Governed Sports & Playing Unit Terminology</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Select multiple sports governed by this federation or create custom sports with tailored unit naming (e.g. Table, Court, Lane, Board).
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleOpenSportPrompt()}
                                className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Custom Sport</span>
                            </button>
                        </div>

                        {/* Sports Grid List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sportsList.map((sport) => (
                                <div
                                    key={sport.id}
                                    className={`rounded-2xl border p-4 transition flex flex-col justify-between space-y-3 ${
                                        sport.active
                                            ? 'border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/20 dark:border-amber-800/60 shadow-2xs'
                                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 opacity-70'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                                    {sport.name}
                                                </h3>
                                                {sport.isCustom && (
                                                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                        Custom
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                Unit Terminology: <strong>{sport.unitNaming}</strong> • {sport.matchFormat?.replace(/_/g, ' ')}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => toggleSportActive(sport.id)}
                                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition shrink-0 ${
                                                sport.active
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                            }`}
                                        >
                                            {sport.active ? 'Active' : 'Disabled'}
                                        </button>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                                        <span className="text-[11px] text-slate-400">
                                            Points per set: <strong>{sport.pointsPerSet || 11}</strong>
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenSportPrompt(sport)}
                                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                            >
                                                <Edit3 className="h-3.5 w-3.5" />
                                            </button>
                                            {sport.isCustom && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteSport(sport.id)}
                                                    className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Federation-wide Competition Rules Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Shield className="h-5 w-5 text-amber-500" />
                                <span>Competition Quotas & Rating Parameters</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Foreign athlete eligibility quotas, dual club league rules, and Elo K-factor math.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                                    Max Foreign Players per Team
                                </label>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Allowed foreign license holders per encounter.
                                </p>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={maxForeignersPerTeam}
                                    onChange={(e) => setMaxForeignersPerTeam(Number(e.target.value))}
                                    className="w-28 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                                    Elo Exchange K-Factor
                                </label>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Rating volatility constant (default: 32).
                                </p>
                                <input
                                    type="number"
                                    min="8"
                                    max="64"
                                    value={eloKFactor}
                                    onChange={(e) => setEloKFactor(Number(e.target.value))}
                                    className="w-28 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        Dual Club Registration
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Allow T-Cards & secondary league registrations.
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={allowTCardDualRegistration}
                                        onChange={(e) => setAllowTCardDualRegistration(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* SECTION 4: AGE SERIES & BRACKETS                         */}
            {/* ======================================================== */}
            {activeTab === 'age-series' && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Users className="h-5 w-5 text-amber-500" />
                                    <span>Age Series & Competition Brackets</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Official age categories for youth (U9–U21), open adult leagues, and senior/veteran divisions (O40–O80).
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleOpenAgeSeriesPrompt()}
                                className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Custom Age Series</span>
                            </button>
                        </div>

                        {/* Cutoff Date Setting */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                    Annual Birth Year Cutoff Reference Date
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Determines age series eligibility based on the athlete's birth date during the active season.
                                </div>
                            </div>
                            <select
                                value={ageCutoffDate}
                                onChange={(e) => setAgeCutoffDate(e.target.value)}
                                className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                            >
                                <option value="07-01">July 1st (European / ITTF Standard Season)</option>
                                <option value="01-01">January 1st (Calendar Year Cutoff)</option>
                                <option value="09-01">September 1st (Academic Year Cutoff)</option>
                            </select>
                        </div>

                        {/* Age Categories Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3">Code</th>
                                        <th className="px-4 py-3">Series Name</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Age Bracket</th>
                                        <th className="px-4 py-3">Description</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                    {ageSeries.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                            <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                                                {item.code}
                                            </td>
                                            <td className="px-4 py-3 text-slate-900 dark:text-white font-semibold">
                                                {item.name}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    item.type === 'YOUTH'
                                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                        : item.type === 'ACTIVES'
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                                }`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                                {item.minAge && item.maxAge
                                                    ? `${item.minAge} – ${item.maxAge} yrs`
                                                    : item.maxAge
                                                    ? `≤ ${item.maxAge} yrs`
                                                    : item.minAge
                                                    ? `≥ ${item.minAge} yrs`
                                                    : 'Open'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px]">
                                                {item.description}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleAgeActive(item.id)}
                                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                                                        item.active
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300'
                                                    }`}
                                                >
                                                    {item.active ? 'Active' : 'Disabled'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenAgeSeriesPrompt(item)}
                                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </button>
                                                    {item.type === 'CUSTOM' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteAgeSeries(item.id)}
                                                            className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* SECTION 5: SEASONS                                       */}
            {/* ======================================================== */}
            {activeTab === 'seasons' && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-amber-500" />
                                    <span>Seasons & Periodicity Management</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Manage federation sporting years, license validity periods, and active competition seasons. Multiple seasons can be active simultaneously (e.g. for juniors, seniors, or overlapping cycles).
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleOpenSeasonPrompt()}
                                className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Create New Season</span>
                            </button>
                        </div>

                        {/* Seasons List Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3">Season Name</th>
                                        <th className="px-4 py-3">Start Date</th>
                                        <th className="px-4 py-3">End Date</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                    {seasons.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                                No seasons registered yet. Create your first season.
                                            </td>
                                        </tr>
                                    ) : (
                                        seasons.map((season) => (
                                            <tr key={season.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                                <td className="px-4 py-3 text-slate-900 dark:text-white font-bold">
                                                    {season.name}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                                                    {new Date(season.startDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                                                    {new Date(season.endDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {season.isCurrent ? (
                                                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                            ACTIVE
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {season.isCurrent ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleSeasonActive(season.id, false)}
                                                                className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition"
                                                            >
                                                                Deactivate
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleSeasonActive(season.id, true)}
                                                                className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-bold transition"
                                                            >
                                                                Activate
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteSeason(season.id)}
                                                            className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* SECTION 6: LICENSING ENGINE & CUSTOM TYPES               */}
            {/* ======================================================== */}
            {activeTab === 'licensing' && (
                <div className="space-y-6">
                    {/* 1. License ID Generator Format */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Key className="h-5 w-5 text-amber-500" />
                                <span>License ID Format Generator</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Customize the automatic numbering format for all newly issued licenses.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Template Pattern *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={template}
                                    onChange={(e) => setTemplate(e.target.value)}
                                    placeholder="{regionDigit}{year2}{counter3}"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Region Digit (1-9)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="9"
                                    value={regionDigit}
                                    onChange={(e) => setRegionDigit(Number(e.target.value))}
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Current Sequential Counter
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={counter}
                                    onChange={(e) => setCounter(Number(e.target.value))}
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Next Issued ID Preview
                                </label>
                                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                                    <span className="font-mono text-sm font-black text-amber-600 dark:text-amber-400">
                                        {previewId}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-amber-600/70 dark:text-amber-400/70">
                                        Live Preview
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Available Tags Documentation */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs">
                            <div className="font-bold text-slate-900 dark:text-white">Supported Template Variables:</div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                <div><code className="text-amber-600 dark:text-amber-400">{'{year4}'}</code> → 2026</div>
                                <div><code className="text-amber-600 dark:text-amber-400">{'{year2}'}</code> → 26</div>
                                <div><code className="text-amber-600 dark:text-amber-400">{'{regionDigit}'}</code> → 1..9</div>
                                <div><code className="text-amber-600 dark:text-amber-400">{'{counter3}'}</code> → 001</div>
                                <div><code className="text-amber-600 dark:text-amber-400">{'{counter4}'}</code> → 0001</div>
                                <div><code className="text-amber-600 dark:text-amber-400">{'{counter5}'}</code> → 00001</div>
                                <div><code className="text-amber-600 dark:text-amber-400">{'{counter6}'}</code> → 000001</div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Custom License Types under 3 Fixed Over-Types */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Award className="h-5 w-5 text-amber-500" />
                                    <span>License Types & Over-Type Classification</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Configure customized license types under the 3 fixed master categories: <strong>PLAYER</strong>, <strong>COACH</strong>, and <strong>REFEREE</strong>.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleOpenLicenseTypePrompt()}
                                className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Custom License Type</span>
                            </button>
                        </div>

                        {/* License Types Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3">License Name & Code</th>
                                        <th className="px-4 py-3">Master Over-Type</th>
                                        <th className="px-4 py-3">Validity Period</th>
                                        <th className="px-4 py-3">Club Requirement</th>
                                        <th className="px-4 py-3">Scope & Rules</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                    {licenseTypes.map((lt) => (
                                        <tr key={lt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    {lt.name}
                                                </div>
                                                <div className="font-mono text-[10px] text-slate-400">
                                                    {lt.code}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    lt.overType === 'PLAYER'
                                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                                        : lt.overType === 'COACH'
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                                }`}>
                                                    {lt.overType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                                                {lt.validityDuration === 'SEASON' && 'Full Season'}
                                                {lt.validityDuration === 'MONTH_12' && '12 Months (Fixed)'}
                                                {lt.validityDuration === 'DAY_1' && '1 Day (Single Match)'}
                                                {lt.validityDuration === 'TOURNAMENT' && 'Tournament Duration'}
                                                {lt.validityDuration === 'CUSTOM_DAYS' && `${lt.customDays || 30} Days`}
                                            </td>
                                            <td className="px-4 py-3">
                                                {lt.requiresClub ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                                        <Check className="h-3 w-3" /> Required
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">Not Required</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 space-y-0.5">
                                                <div className="text-slate-700 dark:text-slate-300">
                                                    {lt.scope === 'ALL_COMPETITIONS' && 'All Competitions & Leagues'}
                                                    {lt.scope === 'LEAGUE_ONLY' && 'League Matches Only'}
                                                    {lt.scope === 'TOURNAMENT_ONLY' && 'Tournaments Only'}
                                                </div>
                                                {lt.requiresRefresherCourse && (
                                                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                                        • Refresher Course Mandatory
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleLicenseTypeActive(lt.id)}
                                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                                                        lt.active
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                                    }`}
                                                >
                                                    {lt.active ? 'Active' : 'Disabled'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenLicenseTypePrompt(lt)}
                                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteLicenseType(lt.id)}
                                                        className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 3. Re-validation & Refresher Courses Requirements */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <UserCheck className="h-5 w-5 text-amber-500" />
                                <span>Requirements for License Re-Validation & Course Refreshers</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Define mandatory course re-certification intervals, advance expiration warnings, and automatic validity renewal.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                                    Refresher Course Validity
                                </label>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Months before a certified coach or referee must re-attend.
                                </p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="6"
                                        max="60"
                                        value={refresherCourseValidityMonths}
                                        onChange={(e) => setRefresherCourseValidityMonths(Number(e.target.value))}
                                        className="w-24 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                    <span className="text-xs text-slate-500">Months</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                                    Advance Expiry Warning
                                </label>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Notice days sent to athletes and officials before license expiration.
                                </p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="7"
                                        max="180"
                                        value={expiryWarningDays}
                                        onChange={(e) => setExpiryWarningDays(Number(e.target.value))}
                                        className="w-24 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                    <span className="text-xs text-slate-500">Days</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                                    Re-Certification Grace Period
                                </label>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Grace window allowed to complete overdue courses.
                                </p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="12"
                                        value={refresherGracePeriodMonths}
                                        onChange={(e) => setRefresherGracePeriodMonths(Number(e.target.value))}
                                        className="w-24 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                    <span className="text-xs text-slate-500">Months</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        Mandatory for Senior Teams
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Requires referee course certificate for senior captains.
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={requireRefereeCourseForSenior}
                                        onChange={(e) => setRequireRefereeCourseForSenior(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* SECTION 7: OFFICIALS & GOVERNANCE BOARD                   */}
            {/* ======================================================== */}
            {activeTab === 'officials' && (
                <div className="space-y-6">
                    {/* Header & Controls Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <UserCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                                        Association Officials & Governance Board
                                    </h2>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Manage designated federation officials, board executives, department heads, and committee delegates.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleOpenAddOfficialPrompt}
                                className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Assign Official</span>
                            </button>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={officialsSearch}
                                    onChange={(e) => setOfficialsSearch(e.target.value)}
                                    placeholder="Search officials by name, email, role, or license ID..."
                                    className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:outline-none transition"
                                />
                                {officialsSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setOfficialsSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="text-xs font-medium text-slate-500 shrink-0">
                                {filteredOfficials.length} of {officials.length} officials
                            </div>
                        </div>

                        {/* Officials List Table / Cards */}
                        {filteredOfficials.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
                                <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                    <UserCheck className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                                        {officialsSearch ? 'No officials match your search' : 'No officials assigned yet'}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                                        {officialsSearch
                                            ? 'Try refining your query or clear the filter to see all federation officials.'
                                            : 'Assign federation executives, general secretaries, referee heads, and administrators to grant governance privileges.'}
                                    </p>
                                </div>
                                {!officialsSearch && (
                                    <button
                                        type="button"
                                        onClick={handleOpenAddOfficialPrompt}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Assign First Official</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            <th className="py-3 px-4">Official / Member</th>
                                            <th className="py-3 px-4">Role & Function</th>
                                            <th className="py-3 px-4">Contact Info</th>
                                            <th className="py-3 px-4">Appointed</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                                        {filteredOfficials.map((off) => {
                                            const badge = getRoleBadge(off.role);
                                            const roleMeta = OFFICIAL_ROLES.find(r => r.value === off.role.toUpperCase());
                                            const initials = `${off.user.firstName?.[0] || ''}${off.user.lastName?.[0] || ''}`.toUpperCase() || 'OF';

                                            return (
                                                <tr
                                                    key={off.id}
                                                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                                                >
                                                    {/* User Identity Column */}
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex items-center gap-3">
                                                            {off.user.avatarUrl ? (
                                                                <img
                                                                    src={off.user.avatarUrl}
                                                                    alt={`${off.user.firstName} ${off.user.lastName}`}
                                                                    className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                                                />
                                                            ) : (
                                                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                                                    {initials}
                                                                </div>
                                                            )}
                                                            <div className="space-y-0.5">
                                                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                    <span>{off.user.firstName} {off.user.lastName}</span>
                                                                    {off.user.currentLevel && (
                                                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                                            {off.user.currentLevel}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {off.user.licenseId && (
                                                                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                                                        <span>License: {off.user.licenseId}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Role Column */}
                                                    <td className="py-3.5 px-4">
                                                        <div className="space-y-1">
                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-bold border ${badge.className}`}
                                                            >
                                                                {badge.label}
                                                            </span>
                                                            {roleMeta?.description && (
                                                                <p className="text-[10px] text-slate-400 max-w-xs line-clamp-1">
                                                                    {roleMeta.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Contact Column */}
                                                    <td className="py-3.5 px-4">
                                                        <div className="space-y-0.5 text-[11px]">
                                                            {off.user.email ? (
                                                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                                                    <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                                                    <span className="truncate max-w-[180px]">{off.user.email}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-400 italic">No email</span>
                                                            )}
                                                            {off.user.phone && (
                                                                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                                                    <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                                                                    <span>{off.user.phone}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Appointed Date Column */}
                                                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                                                        {new Date(off.createdAt).toLocaleDateString(undefined, {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}
                                                    </td>

                                                    {/* Actions Column */}
                                                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditOfficialPrompt(off)}
                                                                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
                                                                title="Change Role"
                                                            >
                                                                <Edit3 className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveOfficial(off)}
                                                                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900 transition"
                                                                title="Remove Official"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Governance Roles Guide Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-4">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Federation Governance Structure & Role Directory
                            </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            The following standard roles define executive responsibilities, reporting lines, and platform access:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                            {OFFICIAL_ROLES.map((roleDef) => {
                                const b = getRoleBadge(roleDef.value);
                                return (
                                    <div
                                        key={roleDef.value}
                                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${b.className}`}>
                                                {b.label}
                                            </span>
                                            <span className="font-mono text-[10px] text-slate-400 font-bold">{roleDef.value}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                                            {roleDef.description}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* SECTION 8: ELO RATING TIERS & LEVEL TABLE                */}
            {/* ======================================================== */}
            {activeTab === 'elo-table' && (
                <div className="space-y-6">
                    {/* Header & Actions Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <TableIcon className="h-5 w-5 text-amber-500" />
                                    <span>Official ELO Rating Tiers & Level Classification Table</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Configure the national federation's official Elo point thresholds, rank level designations (A20–D1), and league eligibility rules. All sub-associations and clubs adhere to this central classification.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleSortTiersByElo(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition"
                                    title="Order tiers by rating (Elite A20 down to D1)"
                                >
                                    <ArrowDownUp className="h-3.5 w-3.5 text-slate-500" />
                                    <span>Sort High → Low</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSortTiersByElo(false)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition"
                                    title="Order tiers by rating (Entry D1 up to Elite A20)"
                                >
                                    <ArrowDownUp className="h-3.5 w-3.5 text-slate-500" />
                                    <span>Sort Low → High</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResetTiersToDefault}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition"
                                >
                                    <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                                    <span>Reset Defaults</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOpenAddTierPrompt}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Add Rank Level</span>
                                </button>
                            </div>
                        </div>

                        {/* General Rating Engine Settings */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Standard Match Rating K-Factor (Sensitivity)
                                </label>
                                <input
                                    type="number"
                                    min="10"
                                    max="64"
                                    value={eloKFactor}
                                    onChange={(e) => setEloKFactor(Number(e.target.value))}
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Default K=32. Higher values cause greater point exchanges per match.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Initial Baseline Provisional Rating (Points)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="2500"
                                    value={initialProvisionalRating}
                                    onChange={(e) => setInitialProvisionalRating(Number(e.target.value))}
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Assigned to newly registered athletes before participating in sanctioned matches (default: 1000 pts).
                                </p>
                            </div>
                        </div>

                        {/* ELO Tiers Table */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    Configured Skill Classification Tiers ({eloTiers.length} Levels)
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    Order determines tournament eligibility hierarchy (1 = Top Rank / Highest Skill)
                                </span>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            <th className="py-3 px-3 w-12 text-center">Rank</th>
                                            <th className="py-3 px-4">Category / Tier</th>
                                            <th className="py-3 px-4">Rank Level</th>
                                            <th className="py-3 px-4">Elo Point Range</th>
                                            <th className="py-3 px-4">League Eligibility</th>
                                            <th className="py-3 px-4">Description & Skill Profile</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                                        {eloTiers.map((tier, index) => {
                                            const isTopCategory = tier.category.startsWith('A');
                                            const isBCategory = tier.category.startsWith('B');
                                            const isCCategory = tier.category.startsWith('C');
                                            const badgeStyle = isTopCategory
                                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                                : isBCategory
                                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                : isCCategory
                                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';

                                            return (
                                                <tr
                                                    key={tier.id || tier.level}
                                                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                                                >
                                                    {/* Order Rank Column */}
                                                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                                        <span className="inline-flex items-center justify-center font-mono font-bold text-[11px] text-slate-400 dark:text-slate-500">
                                                            #{tier.order ?? index + 1}
                                                        </span>
                                                    </td>

                                                    {/* Category Column */}
                                                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                                        {tier.category}
                                                    </td>

                                                    {/* Level Code Column */}
                                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                                        <span
                                                            className={`inline-block px-2.5 py-0.5 rounded-md font-mono font-bold text-xs border ${badgeStyle}`}
                                                        >
                                                            {tier.level}
                                                        </span>
                                                    </td>

                                                    {/* Elo Range Column */}
                                                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                        {tier.minElo} – {tier.maxElo === 3000 ? '∞' : tier.maxElo} pts
                                                    </td>

                                                    {/* League Eligibility Column */}
                                                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                        {tier.leagueEligibility || '—'}
                                                    </td>

                                                    {/* Description Column */}
                                                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs">
                                                        <span className="line-clamp-2">{tier.description || '—'}</span>
                                                    </td>

                                                    {/* Actions Column */}
                                                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {/* Move Up */}
                                                            <button
                                                                type="button"
                                                                disabled={index === 0}
                                                                onClick={() => handleMoveTierUp(index)}
                                                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                                                title="Move Rank Level Up"
                                                            >
                                                                <ChevronUp className="h-3.5 w-3.5" />
                                                            </button>

                                                            {/* Move Down */}
                                                            <button
                                                                type="button"
                                                                disabled={index === eloTiers.length - 1}
                                                                onClick={() => handleMoveTierDown(index)}
                                                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                                                title="Move Rank Level Down"
                                                            >
                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                            </button>

                                                            {/* Edit */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditTierPrompt(tier)}
                                                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-white transition ml-1"
                                                                title="Edit Rank Level"
                                                            >
                                                                <Edit3 className="h-3.5 w-3.5" />
                                                            </button>

                                                            {/* Delete */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteTier(tier)}
                                                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900 transition"
                                                                title="Delete Tier"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Central Governance Notice */}
                    <div className="rounded-3xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-6 sm:p-8 shadow-xs space-y-2">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-sm">
                            <Shield className="h-4 w-4" />
                            <span>Federation-Wide Rating Governance</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            Changes saved here immediately apply to the public <Link href="/utilities/level-table" className="text-amber-600 dark:text-amber-400 underline font-semibold hover:opacity-80">Level & Skill Table</Link>, player profile skill badges, license eligibility checks, and scheduled monthly rating jobs across all regional sub-associations and clubs.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
