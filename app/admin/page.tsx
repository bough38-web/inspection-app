'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminDashboard } from '../components/AdminDashboard';

export default function AdminPage() {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        // Simple auth check
        const isAdmin = document.cookie.includes('is_admin=true') || localStorage.getItem('is_admin') === 'true';
        if (!isAdmin) {
            router.replace('/admin/login');
        } else {
            setAuthorized(true);
        }
    }, [router]);

    if (!authorized) return null; // Or a loading spinner

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <AdminDashboard />
        </main>
    );
}
