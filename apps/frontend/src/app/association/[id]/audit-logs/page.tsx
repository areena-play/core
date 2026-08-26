'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AuditTrailViewer } from '@/components/audit/AuditTrailViewer';

export default function SubAssociationAuditLogsPage() {
    const params = useParams();
    const associationId = params.id as string;

    return <AuditTrailViewer associationId={associationId} isSubAssociation={true} />;
}

