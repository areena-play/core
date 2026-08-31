'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AssociationBillingPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/management/finances');
    }, [router]);
    return null;
}

