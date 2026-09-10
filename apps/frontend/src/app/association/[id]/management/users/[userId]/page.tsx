'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import AdminUserDetailPage from '@/app/management/users/[id]/page';

export default function AssociationAdminUserDetailPage() {
    return <AdminUserDetailPage />;
}
