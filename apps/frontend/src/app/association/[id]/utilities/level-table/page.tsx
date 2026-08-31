'use client';

import { useParams } from 'next/navigation';
import { LevelTableView } from '@/components/views/LevelTableView';

export default function SubAssocLevelPage() {
    const params = useParams();
    const assocId = params?.id as string;
    return <LevelTableView scopedAssociationId={assocId} />;
}
