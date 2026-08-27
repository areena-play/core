'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { BillingDashboard } from '@/components/billing/BillingDashboard';

export default function SubAssociationBillingPage() {
    const params = useParams();
    const associationId = params.id as string;

    return <BillingDashboard associationId={associationId} isSubAssociation={true} />;
}

