'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { UtilitiesOverviewView } from '@/components/views/UtilitiesOverviewView';

export default function SubAssocUtilitiesPage() {
    const params = useParams();
    const assocId = params?.id as string;
    return <UtilitiesOverviewView scopedAssociationId={assocId} />;
}
