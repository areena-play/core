'use client';

import { useParams } from 'next/navigation';
import { ClubsOverviewView } from '@/components/views/ClubsOverviewView';

export default function SubAssocClubsPage() {
    const params = useParams();
    const assocId = params?.id as string;
    return <ClubsOverviewView scopedAssociationId={assocId} />;
}
