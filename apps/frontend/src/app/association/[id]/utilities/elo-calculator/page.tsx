'use client';

import { useParams } from 'next/navigation';
import { EloCalculatorView } from '@/components/views/EloCalculatorView';

export default function SubAssocEloPage() {
    const params = useParams();
    const assocId = params?.id as string;
    return <EloCalculatorView scopedAssociationId={assocId} />;
}
