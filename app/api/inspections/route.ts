import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await adminSupabase
            .from('inspections')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Decrypt business_name for display
        const decryptedData = data?.map(item => ({
            ...item,
            business_name: decrypt(item.business_name)
        }));

        return NextResponse.json(decryptedData || []);

    } catch (e) {
        return NextResponse.json([], { status: 500 });
    }
}
