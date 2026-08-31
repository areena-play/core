'use client';

import { useParams } from 'next/navigation';
import { AssociationsOverviewView } from '@/components/views/AssociationsOverviewView';

export default function SubAssocAssociationsPage() {
    const params = useParams();
    const assocId = params?.id as string;
    return <AssociationsOverviewView scopedAssociationId={assocId} />;
}
