'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AssociationAuditLogsPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/management/audit-logs');
    }, [router]);
    return null;
}

