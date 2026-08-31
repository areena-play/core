'use client';

import { useParams } from 'next/navigation';
import { CompetitionsOverviewView } from '@/components/views/CompetitionsOverviewView';

export default function SubAssocCompetitionsPage() {
    const params = useParams();
    const assocId = params?.id as string;
    return <CompetitionsOverviewView scopedAssociationId={assocId} />;
}
