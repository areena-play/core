'use client';

import { useParams } from 'next/navigation';
import { SupportView } from '@/components/views/SupportView';

export default function SubAssocSupportPage() {
    const params = useParams();
    const assocId = params?.id as string;
    return <SupportView scopedAssociationId={assocId} />;
}
