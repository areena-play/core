'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { LevelTableView } from '@/components/views/LevelTableView';

export default function SubAssocLevelTablePage() {
    const params = useParams();
    const assocId = params?.id as string;
    return <LevelTableView scopedAssociationId={assocId} />;
}
