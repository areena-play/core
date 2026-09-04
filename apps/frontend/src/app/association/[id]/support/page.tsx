'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function SubAssocSupportPage() {
    const params = useParams();
    const router = useRouter();
    const assocId = params?.id as string;

    useEffect(() => {
        if (assocId) {
            router.replace(`/support?context=ASSOCIATION&id=${encodeURIComponent(assocId)}`);
        } else {
            router.replace('/support');
        }
    }, [assocId, router]);

    return (
        <div className="p-8 text-center text-xs text-slate-400">
            Loading Support Portal...
        </div>
    );
}
