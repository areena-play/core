'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function SubAssocTournamentsPage() {
    const params = useParams();
    const router = useRouter();
    const assocId = params?.id as string;

    useEffect(() => {
        if (assocId) {
            router.replace(`/association/${assocId}/competitions?type=tournament`);
        }
    }, [assocId, router]);

    return null;
}
