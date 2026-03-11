import { adminSupabase } from './lib/supabase.ts';

async function checkOrphans() {
    console.log('--- Orphaned Storage Folder Check ---');

    // 1. Get all folder_paths from DB
    const { data: dbItems, error: dbError } = await adminSupabase
        .from('inspections')
        .select('folder_path');

    if (dbError) {
        console.error('DB Fetch Error:', dbError);
        return;
    }

    const dbPaths = new Set(dbItems.map(i => i.folder_path).filter(Boolean));
    console.log(`DB has ${dbPaths.size} registered folders.`);

    // 2. List top-level date folders in storage
    const { data: dateFolders, error: storageError } = await adminSupabase.storage
        .from('inspections')
        .list();

    if (storageError) {
        console.error('Storage List Error:', storageError);
        return;
    }

    let orphansFound = 0;

    for (const dateFolder of dateFolders) {
        if (dateFolder.name === '.emptyFolderPlaceholder') continue;

        // List UUID folders inside date folder
        const { data: uuidFolders } = await adminSupabase.storage
            .from('inspections')
            .list(dateFolder.name);

        if (uuidFolders) {
            for (const uuidFolder of uuidFolders) {
                if (uuidFolder.name === '.emptyFolderPlaceholder') continue;

                const fullPath = `${dateFolder.name}/${uuidFolder.name}`;
                if (!dbPaths.has(fullPath)) {
                    console.log(`[ORPHAN] Found orphaned folder in storage: ${fullPath}`);
                    orphansFound++;

                    // List files in orphan folder
                    const { data: files } = await adminSupabase.storage
                        .from('inspections')
                        .list(fullPath);
                    if (files) {
                        console.log(`   -> Contains ${files.length} files.`);
                    }
                }
            }
        }
    }

    if (orphansFound === 0) {
        console.log('No orphaned folders found in storage.');
    } else {
        console.log(`Total orphans found: ${orphansFound}`);
    }
}

checkOrphans().catch(console.error);
