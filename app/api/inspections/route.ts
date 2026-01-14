import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic'; // Ensure no caching for this route

export async function GET() {
    try {
        const { data, error } = await adminSupabase
            .from('inspections')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json([]);
    }
}
