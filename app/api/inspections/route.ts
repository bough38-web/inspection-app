import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        let query = adminSupabase
            .from('inspections')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply soft delete filter only if requested and column exists
        // (For now, we try with it, and if it fails due to missing column, we fallback)
        const { data, error } = await query.is('deleted_at', null);

        if (error) {
            console.error('Fetch error (retrying without filter):', error);
            // Fallback: fetch all without the filter in case the column doesn't exist yet
            const { data: allData, error: allDataError } = await adminSupabase
                .from('inspections')
                .select('*')
                .order('created_at', { ascending: false });

            if (allDataError) {
                return NextResponse.json({ error: allDataError.message }, { status: 500 });
            }

            // Decrypt business_name for display
            const decryptedData = allData?.map(item => ({
                ...item,
                business_name: decrypt(item.business_name)
            }));
            return NextResponse.json(decryptedData || []);
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
