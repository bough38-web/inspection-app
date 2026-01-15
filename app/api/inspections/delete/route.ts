import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { ids } = await req.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        console.log(`[Batch Delete] Request to delete ${ids.length} items.`);

        // 1. Fetch paths to delete storage files
        const { data: itemsToDelete, error: fetchError } = await adminSupabase
            .from('inspections')
            .select('id, folder_path')
            .in('id', ids);

        if (fetchError) throw fetchError;

        // 2. Delete Storage Files
        for (const item of itemsToDelete) {
            if (item.folder_path) {
                // We need to empty the folder first.
                // Since folder_path is like "2024-01-01/uuid", we list files in it.
                // However, Supabase remove() takes full paths to files.
                // We know files are usually 1.webp, 2.webp, 3.webp.
                // Safer: List files in that folder.
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

        // 3. Delete DB Rows
        const { error: deleteError } = await adminSupabase
            .from('inspections')
            .delete()
            .in('id', ids);

        if (deleteError) throw deleteError;

        return NextResponse.json({ ok: true, deleted: ids.length });

    } catch (error) {
        console.error('Batch delete failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
