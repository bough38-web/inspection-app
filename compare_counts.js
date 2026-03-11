const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function compareCount() {
    console.log('--- DB vs Storage Comparison ---');

    // 1. Get DB count
    const { count: dbCount, error: dbError } = await supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true });

    if (dbError) {
        console.error('DB Error:', dbError);
        return;
    }
    console.log(`Current DB records: ${dbCount}`);

    // 2. Scan Storage for all folders
    let totalStorageFolders = 0;
    const { data: dateFolders, error: storageError } = await supabase.storage
        .from('inspections')
        .list();

    if (storageError) {
        console.error('Storage Error:', storageError);
        return;
    }

    for (const dateFolder of dateFolders) {
        if (dateFolder.name === '.emptyFolderPlaceholder') continue;

        const { data: uuidFolders } = await supabase.storage
            .from('inspections')
            .list(dateFolder.name);

        if (uuidFolders) {
            const count = uuidFolders.filter(f => f.name !== '.emptyFolderPlaceholder').length;
            totalStorageFolders += count;
        }
    }

    console.log(`Total Storage folders found: ${totalStorageFolders}`);

    if (totalStorageFolders > dbCount) {
        console.log(`[RESULT] ${totalStorageFolders - dbCount} orphaned folders found. These are from previously deleted records.`);
    } else {
        console.log('[RESULT] Storage matches DB. No traces of deleted records found.');
    }
}

compareCount().catch(console.error);
