'use client';

import { useParams } from 'next/navigation';
import { LocationsOverviewView } from '@/components/views/LocationsOverviewView';

export default function SubAssocLocationsPage() {
    const params = useParams();
    const assocId = params?.id as string;
    return <LocationsOverviewView scopedAssociationId={assocId} />;
}
