'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AssociationSettingsPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/management/settings');
    }, [router]);
    return null;
}
