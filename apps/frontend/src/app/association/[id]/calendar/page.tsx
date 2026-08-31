'use client';

import { useParams } from 'next/navigation';
import { CalendarOverviewView } from '@/components/views/CalendarOverviewView';

export default function SubAssocCalendarPage() {
    const params = useParams();
    const assocId = params?.id as string;
    return <CalendarOverviewView scopedAssociationId={assocId} />;
}
