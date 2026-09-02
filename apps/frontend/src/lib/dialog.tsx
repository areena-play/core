'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { AlertTriangle, AlertCircle, Info, HelpCircle, Upload, X, FileText } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

export type PromptFieldType =
    | 'text'
    | 'textarea'
    | 'password'
    | 'number'
    | 'select'
    | 'checkbox'
    | 'date'
    | 'time'
    | 'datetime-local'
    | 'file';

export interface PromptFieldOption {
    label: string;
    value: string | number;
}

export interface PromptField {
    name: string;
    label?: string;
    type?: PromptFieldType;
    placeholder?: string;
    defaultValue?: any;
    required?: boolean;
    options?: PromptFieldOption[]; // for 'select'
    accept?: string; // for 'file' e.g. "image/*,.pdf"
    multiple?: boolean; // for 'file'
    min?: number | string; // for 'number', 'date', 'time'
    max?: number | string; // for 'number', 'date', 'time'
    step?: number | string; // for 'number'
    rows?: number; // for 'textarea'
}

export interface PromptOptions {
    title?: string;
    subtitle?: string;
    message?: string;
    icon?: React.ReactNode;
    fields?: PromptField[];
    confirmText?: string;
    cancelText?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ConfirmOptions {
    title?: string;
    subtitle?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

type DialogRequest =
    | {
          kind: 'confirm';
          options: ConfirmOptions;
          resolve: (val: boolean) => void;
      }
    | {
          kind: 'prompt';
          options: PromptOptions;
          isSingleImplicitField: boolean;
          resolve: (val: any) => void;
      };

let activeListener: ((req: DialogRequest | null) => void) | null = null;

/* -------------------------------------------------------------------------- */
/*                           PUBLIC CALLABLE METHODS                          */
/* -------------------------------------------------------------------------- */

/**
 * Prompt the user for one or more inputs.
 * - If called with a string message: returns `Promise<string | null>`.
 * - If called with options: returns `Promise<Record<string, any> | null>`.
 *
 * Supported field types:
 * - 'text' | 'textarea' | 'password' | 'number' | 'select' | 'checkbox'
 * - 'date' | 'time' | 'datetime-local' | 'file' (returns File or File[])
 */
export function prompt(messageOrOptions: string | PromptOptions): Promise<any> {
    return new Promise((resolve) => {
        if (!activeListener) {
            console.warn('<DialogContainer /> is not mounted in layout.');
            resolve(null);
            return;
        }

        if (typeof messageOrOptions === 'string') {
            activeListener({
                kind: 'prompt',
                isSingleImplicitField: true,
                options: {
                    title: 'Input Required',
                    message: messageOrOptions,
                    fields: [{ name: 'value', type: 'text', required: true }],
                },
                resolve,
            });
        } else {
            const fields = messageOrOptions.fields || [
                { name: 'value', type: 'text', required: true },
            ];
            activeListener({
                kind: 'prompt',
                isSingleImplicitField: false,
                options: { ...messageOrOptions, fields },
                resolve,
            });
        }
    });
}

/**
 * Ask the user for confirmation (Yes/No).
 * Returns `Promise<boolean>`.
 */
export function confirm(messageOrOptions: string | ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
        if (!activeListener) {
            console.warn('<DialogContainer /> is not mounted in layout.');
            resolve(false);
            return;
        }

        const options: ConfirmOptions =
            typeof messageOrOptions === 'string'
                ? { message: messageOrOptions }
                : messageOrOptions;

        activeListener({
            kind: 'confirm',
            options,
            resolve,
        });
    });
}

/* -------------------------------------------------------------------------- */
/*                         GLOBAL CONTAINER COMPONENT                         */
/* -------------------------------------------------------------------------- */

export function DialogContainer() {
    const [request, setRequest] = useState<DialogRequest | null>(null);
    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        activeListener = (req) => {
            if (req && req.kind === 'prompt') {
                const initial: Record<string, any> = {};
                req.options.fields?.forEach((f) => {
                    if (f.defaultValue !== undefined) {
                        initial[f.name] = f.defaultValue;
                    } else if (f.type === 'checkbox') {
                        initial[f.name] = false;
                    } else if (f.type === 'file') {
                        initial[f.name] = f.multiple ? [] : null;
                    } else {
                        initial[f.name] = '';
                    }
                });
                setFormValues(initial);
            }
            setRequest(req);
        };

        return () => {
            activeListener = null;
        };
    }, []);

    if (!request) return null;

    /* --- CONFIRM DIALOG --- */
    if (request.kind === 'confirm') {
        const { options, resolve } = request;
        const variant = options.variant || 'warning';

        const getIcon = () => {
            if (variant === 'danger') return <AlertCircle className="h-5 w-5 text-red-500" />;
            if (variant === 'info') return <Info className="h-5 w-5 text-blue-500" />;
            return <AlertTriangle className="h-5 w-5 text-amber-500" />;
        };

        const getConfirmBtnClass = () => {
            if (variant === 'danger') return 'bg-red-600 hover:bg-red-700 text-white';
            if (variant === 'info') return 'bg-blue-600 hover:bg-blue-700 text-white';
            return 'bg-amber-600 hover:bg-amber-700 text-white';
        };

        const handleClose = (result: boolean) => {
            resolve(result);
            setRequest(null);
        };

        return (
            <Modal
                isOpen={true}
                onClose={() => handleClose(false)}
                title={options.title || 'Confirm Action'}
                subtitle={options.subtitle}
                icon={getIcon()}
                size="sm"
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => handleClose(false)}
                            className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                            {options.cancelText || 'Cancel'}
                        </button>
                        <button
                            type="button"
                            autoFocus
                            onClick={() => handleClose(true)}
                            className={`rounded-xl px-4 py-2 text-xs font-bold shadow transition ${getConfirmBtnClass()}`}
                        >
                            {options.confirmText || 'Confirm'}
                        </button>
                    </>
                }
            >
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                    {options.message}
                </p>
            </Modal>
        );
    }

    /* --- PROMPT DIALOG --- */
    const { options, isSingleImplicitField, resolve } = request;

    const handlePromptClose = (submitted: boolean) => {
        if (!submitted) {
            resolve(null);
        } else {
            if (isSingleImplicitField) {
                resolve(formValues.value ?? '');
            } else {
                resolve(formValues);
            }
        }
        setRequest(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handlePromptClose(true);
    };

    return (
        <Modal
            isOpen={true}
            onClose={() => handlePromptClose(false)}
            title={options.title || 'Input Required'}
            subtitle={options.subtitle}
            icon={options.icon || <HelpCircle className="h-5 w-5 text-blue-500" />}
            size={options.size || 'md'}
        >
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {options.message && (
                    <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                        {options.message}
                    </p>
                )}

                <div className="space-y-3.5">
                    {options.fields?.map((field, idx) => {
                        const fieldType = field.type || 'text';
                        const isAutoFocussed = idx === 0 && fieldType !== 'file';

                        return (
                            <div key={field.name} className="space-y-1">
                                {field.label && fieldType !== 'checkbox' && (
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                )}

                                {/* TEXTAREA */}
                                {fieldType === 'textarea' ? (
                                    <textarea
                                        autoFocus={isAutoFocussed}
                                        required={field.required}
                                        rows={field.rows || 3}
                                        placeholder={field.placeholder}
                                        value={formValues[field.name] ?? ''}
                                        onChange={(e) =>
                                            setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                                        }
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                ) : fieldType === 'select' ? (
                                    /* SELECT */
                                    <select
                                        autoFocus={isAutoFocussed}
                                        required={field.required}
                                        value={formValues[field.name] ?? ''}
                                        onChange={(e) =>
                                            setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                                        }
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                    >
                                        <option value="" disabled>
                                            {field.placeholder || 'Select an option...'}
                                        </option>
                                        {field.options?.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : fieldType === 'checkbox' ? (
                                    /* CHECKBOX */
                                    <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                                        <input
                                            type="checkbox"
                                            autoFocus={isAutoFocussed}
                                            checked={Boolean(formValues[field.name])}
                                            onChange={(e) =>
                                                setFormValues((prev) => ({ ...prev, [field.name]: e.target.checked }))
                                            }
                                            className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 dark:border-slate-700"
                                        />
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </span>
                                    </label>
                                ) : fieldType === 'file' ? (
                                    /* FILE UPLOAD */
                                    <div>
                                        <input
                                            ref={(el) => {
                                                fileInputsRef.current[field.name] = el;
                                            }}
                                            type="file"
                                            accept={field.accept}
                                            multiple={field.multiple}
                                            required={field.required && !formValues[field.name]}
                                            onChange={(e) => {
                                                const files = e.target.files;
                                                if (!files || files.length === 0) {
                                                    setFormValues((prev) => ({
                                                        ...prev,
                                                        [field.name]: field.multiple ? [] : null,
                                                    }));
                                                } else {
                                                    setFormValues((prev) => ({
                                                        ...prev,
                                                        [field.name]: field.multiple
                                                            ? Array.from(files)
                                                            : files[0],
                                                    }));
                                                }
                                            }}
                                            className="hidden"
                                        />
                                        <div
                                            onClick={() => fileInputsRef.current[field.name]?.click()}
                                            className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl hover:border-red-500 dark:hover:border-red-500 cursor-pointer bg-slate-50/50 dark:bg-slate-950/50 transition group"
                                        >
                                            <Upload className="h-6 w-6 text-slate-400 group-hover:text-red-500 transition mb-1" />
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                {field.placeholder || 'Click to select file...'}
                                            </span>
                                            {field.accept && (
                                                <span className="text-[10px] text-slate-400 mt-0.5">
                                                    Accepted: {field.accept}
                                                </span>
                                            )}
                                        </div>

                                        {/* Selected file(s) preview badge */}
                                        {formValues[field.name] && (
                                            <div className="mt-2 space-y-1">
                                                {(Array.isArray(formValues[field.name])
                                                    ? formValues[field.name]
                                                    : [formValues[field.name]]
                                                ).map((file: File, fIdx: number) => (
                                                    <div
                                                        key={fIdx}
                                                        className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 text-[11px]"
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <FileText className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                                            <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                                                {file.name}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                                ({(file.size / 1024).toFixed(1)} KB)
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (fileInputsRef.current[field.name]) {
                                                                    fileInputsRef.current[field.name]!.value = '';
                                                                }
                                                                setFormValues((prev) => ({
                                                                    ...prev,
                                                                    [field.name]: field.multiple ? [] : null,
                                                                }));
                                                            }}
                                                            className="text-slate-400 hover:text-red-500 p-0.5"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* STANDARD INPUTS (text, password, number, date, time, datetime-local) */
                                    <input
                                        type={fieldType}
                                        autoFocus={isAutoFocussed}
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        min={field.min}
                                        max={field.max}
                                        step={field.step}
                                        value={formValues[field.name] ?? ''}
                                        onChange={(e) =>
                                            setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                                        }
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => handlePromptClose(false)}
                        className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                        {options.cancelText || 'Cancel'}
                    </button>
                    <button
                        type="submit"
                        className="rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2 text-xs font-bold text-white shadow transition"
                    >
                        {options.confirmText || 'Submit'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

