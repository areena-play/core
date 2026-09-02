'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    CountryPhoneOption,
    POPULAR_COUNTRY_CODES,
    DEFAULT_PHONE_COUNTRY,
    normalizePhoneNumber,
    extractCountryAndNationalNumber,
} from '@areena/shared';
import type { CountryCode } from 'libphonenumber-js';
import { ChevronDown, Phone } from 'lucide-react';

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
}: PhoneInputProps) {
    const [selectedCountry, setSelectedCountry] = useState<CountryCode>(defaultCountry);
    const [nationalNumber, setNationalNumber] = useState<string>('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Synchronize internal state when value prop changes externally
    useEffect(() => {
        if (!value) {
            setNationalNumber('');
            return;
        }

        const { country, national } = extractCountryAndNationalNumber(value, selectedCountry || defaultCountry);
        setSelectedCountry(country);
        setNationalNumber(national);
    }, [value]);

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

    const activeCountryOption: CountryPhoneOption =
        POPULAR_COUNTRY_CODES.find((c) => c.code === selectedCountry) ||
        POPULAR_COUNTRY_CODES[0];

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
                    <span className="text-base leading-none">{activeCountryOption.flag}</span>
                    <span className="font-mono text-xs">{activeCountryOption.callingCode}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Country List Dropdown Menu */}
                {dropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-56 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 z-50 py-1 text-xs">
                        {POPULAR_COUNTRY_CODES.map((item) => (
                            <button
                                key={item.code}
                                type="button"
                                onClick={() => handleSelectCountry(item)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition ${
                                    item.code === selectedCountry
                                        ? 'bg-red-50 text-red-600 font-semibold dark:bg-red-950/40 dark:text-red-400'
                                        : 'text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <span className="text-base">{item.flag}</span>
                                    <span className="truncate">{item.name}</span>
                                </div>
                                <span className="font-mono text-[11px] text-slate-400 font-normal ml-2">
                                    {item.callingCode}
                                </span>
                            </button>
                        ))}
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
