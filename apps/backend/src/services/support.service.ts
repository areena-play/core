import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { EmailService } from './email.service';

export interface GetFaqsQuery {
    contextType?: 'SYSTEM' | 'ASSOCIATION' | 'CLUB' | 'TOURNAMENT' | string;
    contextId?: string;
    category?: string;
    search?: string;
}

export interface GetSubjectsQuery {
    contextType?: 'SYSTEM' | 'ASSOCIATION' | 'CLUB' | 'TOURNAMENT' | string;
    contextId?: string;
}

export interface SubmitInquiryData {
    name: string;
    email: string;
    userId?: string;
    subjectId?: string;
    customSubjectTitle?: string;
    contextType?: 'SYSTEM' | 'ASSOCIATION' | 'CLUB' | 'TOURNAMENT' | string;
    contextId?: string;
    message: string;
    faqsConfirmed: boolean;
}

export class SupportService {
    /**
     * Resolves FAQs for the requested context (Global + Entity specific)
     */
    static async getFaqs(query: GetFaqsQuery) {
        const { contextType, contextId, category, search } = query;

        const whereConditions: any[] = [];

        // Contextual filters
        if (contextType === 'ASSOCIATION' && contextId) {
            whereConditions.push({
                OR: [
                    { associationId: contextId },
                    { associationId: null, clubId: null, competitionId: null }, // Include Global
                ],
            });
        } else if (contextType === 'CLUB' && contextId) {
            whereConditions.push({
                OR: [
                    { clubId: contextId },
                    { associationId: null, clubId: null, competitionId: null }, // Include Global
                ],
            });
        } else if (contextType === 'TOURNAMENT' && contextId) {
            whereConditions.push({
                OR: [
                    { competitionId: contextId },
                    { associationId: null, clubId: null, competitionId: null }, // Include Global
                ],
            });
        } else {
            // General / System FAQs
            whereConditions.push({
                associationId: null,
                clubId: null,
                competitionId: null,
            });
        }

        const where: any = {
            isPublished: true,
            AND: whereConditions,
        };

        if (category && category !== 'ALL') {
            where.category = category;
        }

        if (search && search.trim().length > 0) {
            const term = search.trim();
            where.OR = [
                { question: { contains: term, mode: 'insensitive' } },
                { answer: { contains: term, mode: 'insensitive' } },
            ];
        }

        return prisma.faqItem.findMany({
            where,
            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        });
    }

    /**
     * Resolves active support subjects for the requested context
     */
    static async getSubjects(query: GetSubjectsQuery) {
        const { contextType, contextId } = query;

        const whereConditions: any[] = [];

        if (contextType === 'ASSOCIATION' && contextId) {
            whereConditions.push({
                OR: [
                    { associationId: contextId },
                    { isSystem: true },
                    { targetType: 'SYSTEM' },
                ],
            });
        } else if (contextType === 'CLUB' && contextId) {
            whereConditions.push({
                OR: [
                    { clubId: contextId },
                    { isSystem: true },
                    { targetType: 'SYSTEM' },
                ],
            });
        } else if (contextType === 'TOURNAMENT' && contextId) {
            whereConditions.push({
                OR: [
                    { competitionId: contextId },
                    { isSystem: true },
                    { targetType: 'SYSTEM' },
                ],
            });
        } else {
            // General / System subjects
            whereConditions.push({
                OR: [
                    { isSystem: true },
                    { targetType: 'SYSTEM' },
                    { associationId: null, clubId: null, competitionId: null },
                ],
            });
        }

        return prisma.supportSubject.findMany({
            where: {
                isActive: true,
                AND: whereConditions,
            },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        });
    }

    /**
     * Submits a support inquiry and routes it to the computed destination
     */
    static async submitInquiry(data: SubmitInquiryData) {
        if (!data.faqsConfirmed) {
            throw new Error('You must confirm that you have reviewed the FAQs before submitting an inquiry.');
        }

        if (!data.name || !data.email || !data.message) {
            throw new Error('Name, email, and message are required fields.');
        }

        let subjectTitle = data.customSubjectTitle || 'General Support Inquiry';
        let targetRecipient = config.supportEmail;
        let contextLabel = 'AREENA Platform (System)';

        // 1. Resolve subject if subjectId provided
        let subjectRecord = null;
        if (data.subjectId) {
            subjectRecord = await prisma.supportSubject.findUnique({
                where: { id: data.subjectId },
            });
            if (subjectRecord) {
                subjectTitle = subjectRecord.title;
            }
        }

        // 2. Resolve destination email and context label
        if (subjectRecord?.recipientEmail) {
            // Direct override email set on subject
            targetRecipient = subjectRecord.recipientEmail;
        } else if (subjectRecord?.targetType === 'SYSTEM' || data.contextType === 'SYSTEM' || !data.contextType) {
            targetRecipient = config.supportEmail;
            contextLabel = 'AREENA Platform Support';
        } else if (data.contextType === 'ASSOCIATION' && data.contextId) {
            const assoc = await prisma.association.findUnique({
                where: { id: data.contextId },
                include: {
                    adminRoles: {
                        include: { user: true },
                    },
                },
            });

            if (assoc) {
                contextLabel = `Association: ${assoc.name} (${assoc.code})`;
                const adminUser = assoc.adminRoles?.[0]?.user;
                if (adminUser?.email) {
                    targetRecipient = adminUser.email;
                }
            }
        } else if (data.contextType === 'CLUB' && data.contextId) {
            const club = await prisma.club.findUnique({
                where: { id: data.contextId },
                include: {
                    adminRoles: {
                        include: { user: true },
                    },
                },
            });

            if (club) {
                contextLabel = `Club: ${club.name} (${club.code})`;
                targetRecipient = club.email || club.adminRoles?.[0]?.user?.email || config.supportEmail;
            }
        } else if (data.contextType === 'TOURNAMENT' && data.contextId) {
            const comp = await prisma.competition.findUnique({
                where: { id: data.contextId },
                include: {
                    association: {
                        include: { adminRoles: { include: { user: true } } },
                    },
                },
            });

            if (comp) {
                contextLabel = `Tournament: ${comp.name}`;
                targetRecipient = comp.association?.adminRoles?.[0]?.user?.email || config.supportEmail;
            }
        }

        // 3. Generate unique ticket number: SUP-YYYY-XXXX
        const year = new Date().getFullYear();
        const rand = Math.floor(1000 + Math.random() * 9000);
        const ticketNumber = `SUP-${year}-${rand}`;

        // 4. Save SupportInquiry record in database
        const inquiry = await prisma.supportInquiry.create({
            data: {
                ticketNumber,
                senderName: data.name,
                senderEmail: data.email,
                senderUserId: data.userId || null,
                subjectId: data.subjectId || null,
                subjectTitle,
                message: data.message,
                contextType: data.contextType || 'SYSTEM',
                contextId: data.contextId || null,
                recipientEmail: targetRecipient,
                faqsConfirmed: true,
                status: 'OPEN',
            },
        });

        // 5. Dispatch email to recipient and confirmation to user
        await EmailService.sendSupportInquiryEmail({
            to: targetRecipient,
            ticketNumber,
            senderName: data.name,
            senderEmail: data.email,
            subjectTitle,
            contextLabel,
            message: data.message,
        });

        await EmailService.sendSupportReceiptEmail({
            to: data.email,
            senderName: data.name,
            ticketNumber,
            subjectTitle,
            contextLabel,
        });

        return inquiry;
    }

    // ========================================================================
    // ADMIN CRUD METHODS
    // ========================================================================

    static async createFaq(data: {
        question: string;
        answer: string;
        questionI18n?: any;
        answerI18n?: any;
        category?: string;
        categoryI18n?: any;
        order?: number;
        associationId?: string | null;
        clubId?: string | null;
        competitionId?: string | null;
        createdById?: string;
    }) {
        return prisma.faqItem.create({
            data: {
                question: data.question,
                answer: data.answer,
                questionI18n: data.questionI18n || null,
                answerI18n: data.answerI18n || null,
                category: data.category || 'GENERAL',
                categoryI18n: data.categoryI18n || null,
                order: data.order ?? 0,
                associationId: data.associationId || null,
                clubId: data.clubId || null,
                competitionId: data.competitionId || null,
                createdById: data.createdById || null,
                isPublished: true,
            },
        });
    }

    static async updateFaq(id: string, data: any) {
        return prisma.faqItem.update({
            where: { id },
            data,
        });
    }

    static async deleteFaq(id: string) {
        return prisma.faqItem.delete({
            where: { id },
        });
    }

    static async createSubject(data: {
        title: string;
        titleI18n?: any;
        description?: string;
        descriptionI18n?: any;
        targetType?: string;
        recipientEmail?: string | null;
        associationId?: string | null;
        clubId?: string | null;
        competitionId?: string | null;
        isSystem?: boolean;
        order?: number;
    }) {
        return prisma.supportSubject.create({
            data: {
                title: data.title,
                titleI18n: data.titleI18n || null,
                description: data.description || null,
                descriptionI18n: data.descriptionI18n || null,
                targetType: data.targetType || 'SYSTEM',
                recipientEmail: data.recipientEmail || null,
                associationId: data.associationId || null,
                clubId: data.clubId || null,
                competitionId: data.competitionId || null,
                isSystem: data.isSystem ?? false,
                order: data.order ?? 0,
                isActive: true,
            },
        });
    }

    static async updateSubject(id: string, data: any) {
        return prisma.supportSubject.update({
            where: { id },
            data,
        });
    }

    static async deleteSubject(id: string) {
        return prisma.supportSubject.delete({
            where: { id },
        });
    }

    static async getInquiries(params: { contextType?: string; contextId?: string; status?: string }) {
        const where: any = {};
        if (params.contextType) where.contextType = params.contextType;
        if (params.contextId) where.contextId = params.contextId;
        if (params.status) where.status = params.status;

        return prisma.supportInquiry.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
}
