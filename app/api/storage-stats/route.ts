import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Fetch all inspection folder paths
        const { data: inspections, error } = await adminSupabase
            .from('inspections')
            .select('folder_path');

        if (error) throw error;

        // 2. Iterate and sum up sizes
        // Note: This could be slow with many records. Optimization would be to store size in DB.
        // For now (20 records), this is acceptable.
        let totalUsedBytes = 0;

        // Concurrency limit could be applied here if needed, but for <100 records OK.
        const promises = inspections.map(async (item) => {
            if (!item.folder_path) return;

            const { data: files, error: listError } = await adminSupabase.storage
                .from('inspections')
                .list(item.folder_path);

            if (files) {
                files.forEach(f => {
                    if (f.metadata && f.metadata.size) {
                        totalUsedBytes += f.metadata.size;
                    }
                });
            }
        });

        await Promise.all(promises);

        // 3. Define Quota (e.g., 512MB for Free Tier Simulation)
        const MAX_LIMIT = 512 * 1024 * 1024; // 512MB

        return NextResponse.json({
            usedBytes: totalUsedBytes,
            maxBytes: MAX_LIMIT,
            percentage: (totalUsedBytes / MAX_LIMIT) * 100
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
