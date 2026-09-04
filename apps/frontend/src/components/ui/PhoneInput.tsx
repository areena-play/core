'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    CountryPhoneOption,
    DEFAULT_PHONE_COUNTRY,
    DEFAULT_PRIORITIZED_COUNTRIES,
    getSortedCountryPhoneOptions,
    normalizePhoneNumber,
    extractCountryAndNationalNumber,
} from '@areena/shared';
import type { CountryCode } from 'libphonenumber-js';
import { ChevronDown, Search, X } from 'lucide-react';
import { FlagIcon } from '@/components/ui/FlagIcon';
import { useMainView } from '@/lib/mainViewContext';
import { useI18n } from '@/lib/i18nContext';

export interface PhoneInputProps {
    value: string;
    onChange: (formattedE164OrInternational: string) => void;
    id?: string;
    name?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
    defaultCountry?: CountryCode;
    prioritizedCountries?: string[];
}

export function PhoneInput({
    value,
    onChange,
    id,
    name,
    required = false,
    disabled = false,
    className = '',
    placeholder = '79 123 45 67',
    defaultCountry = DEFAULT_PHONE_COUNTRY,
    prioritizedCountries,
}: PhoneInputProps) {
    const { mainAssoc } = useMainView();
    const { locale } = useI18n();

    const [selectedCountry, setSelectedCountry] = useState<CountryCode>(defaultCountry);
    const [nationalNumber, setNationalNumber] = useState<string>('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Compute prioritized and alphabetically sorted countries
    const { prioritized, others, all } = useMemo(() => {
        const effectivePrioritized =
            prioritizedCountries ||
            mainAssoc?.rules?.prioritizedCountryCodes ||
            DEFAULT_PRIORITIZED_COUNTRIES;
        return getSortedCountryPhoneOptions(effectivePrioritized, locale);
    }, [prioritizedCountries, mainAssoc?.rules?.prioritizedCountryCodes, locale]);

    // Active selected country option
    const activeCountryOption: CountryPhoneOption = useMemo(() => {
        return (
            all.find((c) => c.code === selectedCountry) ||
            all.find((c) => c.code === defaultCountry) ||
            all[0]
        );
    }, [all, selectedCountry, defaultCountry]);

    // Filtered countries based on search
    const filteredResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return null;
        return all.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.callingCode.includes(q) ||
                c.code.toLowerCase().includes(q)
        );
    }, [all, searchQuery]);

    // Synchronize internal state when value prop changes externally
    useEffect(() => {
        if (!value) {
            setNationalNumber('');
            return;
        }

        const { country, national } = extractCountryAndNationalNumber(
            value,
            selectedCountry || defaultCountry
        );
        setSelectedCountry(country);
        setNationalNumber(national);
    }, [value]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (dropdownOpen) {
            setSearchQuery('');
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [dropdownOpen]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNationalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setNationalNumber(raw);

        // If user explicitly pasted or typed a full international number with +, extract country
        if (raw.trim().startsWith('+')) {
            const parsed = extractCountryAndNationalNumber(raw, selectedCountry);
            setSelectedCountry(parsed.country);
            setNationalNumber(parsed.national);
            const normalized = normalizePhoneNumber(raw, parsed.country);
            onChange(normalized);
            return;
        }

        // Combine active calling code with national digits
        if (!raw.trim()) {
            onChange('');
            return;
        }

        const combined = `${activeCountryOption.callingCode} ${raw.trim()}`;
        onChange(combined);
    };

    const handleBlur = () => {
        if (!nationalNumber.trim()) {
            onChange('');
            return;
        }
        const combined = `${activeCountryOption.callingCode} ${nationalNumber.trim()}`;
        const normalized = normalizePhoneNumber(combined, selectedCountry);
        const { national } = extractCountryAndNationalNumber(normalized, selectedCountry);
        setNationalNumber(national || nationalNumber);
        onChange(normalized);
    };

    const handleSelectCountry = (country: CountryPhoneOption) => {
        setSelectedCountry(country.code);
        setDropdownOpen(false);

        if (nationalNumber.trim()) {
            const combined = `${country.callingCode} ${nationalNumber.trim()}`;
            const normalized = normalizePhoneNumber(combined, country.code);
            onChange(normalized);
        }
    };

    const renderCountryItem = (item: CountryPhoneOption) => {
        const isSelected = item.code === selectedCountry;
        return (
            <button
                key={item.code}
                type="button"
                onClick={() => handleSelectCountry(item)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition ${
                    isSelected
                        ? 'bg-red-50 text-red-600 font-semibold dark:bg-red-950/40 dark:text-red-400'
                        : 'text-slate-700 dark:text-slate-300'
                }`}
            >
                <div className="flex items-center gap-2 truncate min-w-0">
                    <FlagIcon code={item.code} className="w-4.5 h-3 shrink-0 rounded-[2px]" />
                    <span className="truncate">{item.name}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400 font-normal ml-2 shrink-0">
                    {item.callingCode}
                </span>
            </button>
        );
    };

    return (
        <div className={`relative flex items-center w-full ${className}`}>
            {/* Country Calling Code Dropdown Trigger */}
            <div ref={dropdownRef} className="relative">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 h-10 px-2.5 rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 text-xs font-semibold focus:outline-none transition select-none disabled:opacity-50"
                    title={`${activeCountryOption.name} (${activeCountryOption.callingCode})`}
                >
                    <FlagIcon code={activeCountryOption.code} className="w-4.5 h-3 rounded-[2px]" />
                    <span className="font-mono text-xs">{activeCountryOption.callingCode}</span>
                    <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                            dropdownOpen ? 'rotate-180' : ''
                        }`}
                    />
                </button>

                {/* Country List Dropdown Menu */}
                {dropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-64 max-h-72 flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 z-50 overflow-hidden text-xs animate-in fade-in-50 zoom-in-95">
                        {/* Search Bar inside dropdown */}
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="relative flex items-center">
                                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search country or code..."
                                    className="w-full h-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-7 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-red-500 focus:outline-none"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Scrollable list */}
                        <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
                            {filteredResults ? (
                                filteredResults.length > 0 ? (
                                    filteredResults.map(renderCountryItem)
                                ) : (
                                    <div className="px-4 py-6 text-center text-xs text-slate-400">
                                        No matching countries found
                                    </div>
                                )
                            ) : (
                                <>
                                    {/* Prioritized Countries Section */}
                                    {prioritized.length > 0 && (
                                        <div>
                                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/60 mb-0.5">
                                                Priority Countries
                                            </div>
                                            {prioritized.map(renderCountryItem)}
                                        </div>
                                    )}

                                    {/* All Other Countries (Alphabetical) */}
                                    {others.length > 0 && (
                                        <div>
                                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/70 dark:bg-slate-900/60 border-y border-slate-100 dark:border-slate-800/60 my-0.5">
                                                All Countries (A–Z)
                                            </div>
                                            {others.map(renderCountryItem)}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* National Phone Number Input */}
            <input
                id={id}
                name={name}
                type="tel"
                required={required}
                disabled={disabled}
                placeholder={placeholder}
                value={nationalNumber}
                onChange={handleNationalChange}
                onBlur={handleBlur}
                className="w-full h-10 rounded-r-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none text-xs font-mono"
            />
        </div>
    );
}
