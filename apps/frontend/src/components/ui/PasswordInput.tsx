'use client';

import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    containerClassName?: string;
    showToggle?: boolean;
    leftIcon?: React.ReactNode;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    (
        {
            className = '',
            containerClassName = '',
            showToggle = true,
            leftIcon,
            disabled,
            ...props
        },
        ref
    ) => {
        const [isVisible, setIsVisible] = useState(false);

        const toggleVisibility = () => {
            if (disabled) return;
            setIsVisible((prev) => !prev);
        };

        return (
            <div className={`relative flex items-center w-full ${containerClassName}`}>
                {leftIcon && (
                    <div className="absolute left-3.5 pointer-events-none text-slate-400 dark:text-slate-500 flex items-center justify-center">
                        {leftIcon}
                    </div>
                )}
                <input
                    ref={ref}
                    type={isVisible ? 'text' : 'password'}
                    disabled={disabled}
                    className={`w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none transition-colors ${
                        leftIcon ? 'pl-10' : ''
                    } ${showToggle ? 'pr-10' : ''} ${className}`}
                    {...props}
                />
                {showToggle && (
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={toggleVisibility}
                        disabled={disabled}
                        aria-label={isVisible ? 'Hide password' : 'Show password'}
                        title={isVisible ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isVisible ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                    </button>
                )}
            </div>
        );
    }
);

PasswordInput.displayName = 'PasswordInput';

