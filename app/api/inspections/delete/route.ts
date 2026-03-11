import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { ids } = await req.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        console.log(`[Batch Delete] Request to delete ${ids.length} items.`);

        /* Storage Protection: Do not delete photos during Soft Delete
        for (const item of itemsToDelete) {
            if (item.folder_path) {
                const { data: files } = await adminSupabase.storage
                    .from('inspections')
                    .list(item.folder_path);

                if (files && files.length > 0) {
                    const filesToRemove = files.map(f => `${item.folder_path}/${f.name}`);
                    await adminSupabase.storage
                        .from('inspections')
                        .remove(filesToRemove);
                }
            }
        }
        */

        // 3. Soft Delete: Update deleted_at column instead of hard delete
        const { error: deleteError } = await adminSupabase
            .from('inspections')
            .update({ deleted_at: new Date().toISOString() })
            .in('id', ids);

        if (deleteError) throw deleteError;

        return NextResponse.json({ ok: true, deleted: ids.length });

    } catch (error) {
        console.error('Batch delete failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
