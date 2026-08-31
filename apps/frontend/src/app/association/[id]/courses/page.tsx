'use client';

import { useParams } from 'next/navigation';
import { RefresherCoursesView } from '@/components/views/RefresherCoursesView';

export default function SubAssocCoursesPage() {
    const params = useParams();
    const assocId = params?.id as string;
    return <RefresherCoursesView scopedAssociationId={assocId} />;
}
