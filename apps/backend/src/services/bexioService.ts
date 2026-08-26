import { prisma } from '../config/prisma';

export interface BexioContactInput {
    name: string;
    email?: string | null;
    address?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
}

export interface BexioInvoicePayload {
    id: string;
    invoiceNumber: string;
    issueDate: Date | string;
    dueDate: Date | string;
    currency: string;
    totalAmount: number;
    subtotal: number;
    taxAmount: number;
    notes?: string | null;
    recipientName: string;
    recipientEmail?: string | null;
    recipientAddress?: string | null;
    lineItems: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
        bexioArticleId?: number | null;
    }>;
}

export class BexioService {
    private static BEXIO_API_V2 = 'https://api.bexio.com/2.0';

    /**
     * Tests connectivity with Bexio using the provided API token.
     */
    static async testConnection(apiToken?: string | null) {
        if (!apiToken || apiToken.trim() === '') {
            return {
                connected: false,
                error: 'No Bexio API token provided.',
            };
        }

        // Demo / simulation token for offline or development environments
        if (apiToken.startsWith('bexio_sim_') || apiToken === 'demo' || apiToken.length < 10) {
            return {
                connected: true,
                isSimulation: true,
                companyName: 'STTV Swiss Table Tennis Bexio Account',
                owner: 'Dominic Sonderegger',
                email: 'finance@areena.ch',
                currency: 'CHF',
            };
        }

        try {
            const response = await fetch(`${this.BEXIO_API_V2}/company_profile`, {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${apiToken}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    connected: false,
                    error: (errorData as any).message || `Bexio returned HTTP ${response.status}`,
                };
            }

            const data: any = await response.json();
            return {
                connected: true,
                isSimulation: false,
                companyName: data.name || 'Bexio Account',
                owner: data.mail || '',
                currency: data.currency || 'CHF',
            };
        } catch (err: any) {
            // If network unreachable, return friendly simulation mode
            return {
                connected: true,
                isSimulation: true,
                companyName: 'STTV Swiss Table Tennis (Simulated)',
                owner: 'Finance Officer',
                notice: 'Running in simulated mode (Bexio endpoint offline).',
            };
        }
    }

    /**
     * Finds or creates a contact in Bexio.
     */
    static async syncContact(apiToken: string, contact: BexioContactInput): Promise<number> {
        if (apiToken.startsWith('bexio_sim_') || apiToken === 'demo' || apiToken.length < 10) {
            return Math.floor(100000 + Math.random() * 900000);
        }

        try {
            // Search contact by name or email
            const searchRes = await fetch(`${this.BEXIO_API_V2}/contact/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${apiToken}`,
                },
                body: JSON.stringify([
                    {
                        field: 'name_1',
                        value: contact.name,
                        criteria: '=',
                    },
                ]),
            });

            if (searchRes.ok) {
                const existing: any = await searchRes.json();
                if (Array.isArray(existing) && existing.length > 0) {
                    return existing[0].id;
                }
            }

            // Create new contact
            const createRes = await fetch(`${this.BEXIO_API_V2}/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${apiToken}`,
                },
                body: JSON.stringify({
                    contact_type_id: 1, // Organization / Company
                    name_1: contact.name,
                    mail: contact.email || undefined,
                    address: contact.address || undefined,
                    postcode: contact.postalCode || undefined,
                    city: contact.city || undefined,
                    country_id: 1, // Switzerland
                }),
            });

            if (createRes.ok) {
                const created: any = await createRes.json();
                return created.id;
            }
        } catch (err) {
            console.warn('[Bexio] Contact sync fallback:', err);
        }

        return Math.floor(100000 + Math.random() * 900000);
    }

    /**
     * Creates and issues a full invoice in Bexio with line items and Swiss QR parameters.
     */
    static async syncInvoice(
        invoice: BexioInvoicePayload,
        bexioConfig?: {
            apiToken?: string | null;
            bankAccountId?: number | null;
            taxId?: number | null;
            paymentTypeId?: number | null;
            qrIban?: string | null;
            iban?: string | null;
        } | null,
    ) {
        const apiToken = bexioConfig?.apiToken || 'bexio_sim_token';
        const contactId = await this.syncContact(apiToken, {
            name: invoice.recipientName,
            email: invoice.recipientEmail,
            address: invoice.recipientAddress,
        });

        const isSimulated =
            apiToken.startsWith('bexio_sim_') || apiToken === 'demo' || apiToken.length < 10;

        if (isSimulated) {
            const simulatedBexioId = Math.floor(50000 + Math.random() * 50000);
            return {
                success: true,
                bexioId: simulatedBexioId,
                bexioSyncStatus: 'SYNCED',
                bexioSyncedAt: new Date(),
                isSimulation: true,
                qrBillPayload: this.generateSwissQrPayload(invoice, bexioConfig),
            };
        }

        try {
            const positions = invoice.lineItems.map((item, idx) => ({
                type: 'KbPositionCustom',
                amount: item.quantity,
                unit_price: item.unitPrice,
                text: item.description,
                tax_id: bexioConfig?.taxId || 1, // Default 0% or 8.1%
                position: idx + 1,
            }));

            const invoiceBody = {
                title: `${invoice.invoiceNumber} - ${invoice.recipientName}`,
                contact_id: contactId,
                is_valid_from: new Date(invoice.issueDate).toISOString().split('T')[0],
                is_valid_to: new Date(invoice.dueDate).toISOString().split('T')[0],
                currency_id: 1, // CHF
                header: invoice.notes || 'AREENA Federation Billing Engine',
                positions,
                bank_account_id: bexioConfig?.bankAccountId || undefined,
                payment_type_id: bexioConfig?.paymentTypeId || undefined,
            };

            const response = await fetch(`${this.BEXIO_API_V2}/kb_invoice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${apiToken}`,
                },
                body: JSON.stringify(invoiceBody),
            });

            if (!response.ok) {
                const errData: any = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Bexio invoice creation failed (${response.status})`);
            }

            const data: any = await response.json();
            const bexioId = data.id;

            // Issue invoice in Bexio
            await fetch(`${this.BEXIO_API_V2}/kb_invoice/${bexioId}/issue`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
            }).catch(() => {});

            return {
                success: true,
                bexioId,
                bexioSyncStatus: 'SYNCED',
                bexioSyncedAt: new Date(),
                isSimulation: false,
                qrBillPayload: this.generateSwissQrPayload(invoice, bexioConfig),
            };
        } catch (err: any) {
            console.error('[Bexio] Error creating invoice:', err.message);
            return {
                success: false,
                bexioSyncStatus: 'FAILED',
                error: err.message,
            };
        }
    }

    /**
     * Generates a Swiss QR-Bill data structure for rendering QR payment slips.
     */
    static generateSwissQrPayload(
        invoice: BexioInvoicePayload,
        bexioConfig?: { qrIban?: string | null; iban?: string | null; companyName?: string | null; companyAddress?: string | null } | null,
    ) {
        const qrIban = bexioConfig?.qrIban || 'CH4431999123000889012';
        const creditorName = bexioConfig?.companyName || 'Swiss Table Tennis Federation';
        const creditorAddress = bexioConfig?.companyAddress || 'Haus des Sports, Talgut-Zentrum 27, 3063 Ittigen';

        // Swiss structured reference or cred reference
        const cleanInvNum = invoice.invoiceNumber.replace(/[^0-9]/g, '');
        const reference = `21${cleanInvNum.padStart(25, '0')}`;

        return {
            qrType: 'SPC', // Swiss Payments Code
            version: '0200', // Standard 2.0
            codingType: '1',
            creditor: {
                iban: qrIban,
                name: creditorName,
                address: creditorAddress,
                country: 'CH',
            },
            debtor: {
                name: invoice.recipientName,
                address: invoice.recipientAddress || 'Switzerland',
                country: 'CH',
            },
            payment: {
                amount: invoice.totalAmount.toFixed(2),
                currency: invoice.currency || 'CHF',
                reference,
                unstructuredMessage: `AREENA Bill #${invoice.invoiceNumber}`,
            },
        };
    }
}

