'use client';

import { useParams } from 'next/navigation';
import { PeopleOverviewView } from '@/components/views/PeopleOverviewView';

export default function SubAssocPeoplePage() {
    const params = useParams();
    const assocId = params?.id as string;
    return <PeopleOverviewView scopedAssociationId={assocId} />;
}
