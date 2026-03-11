const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.production') });

// Bypass SSL issues for local script execution
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchemaAndOrphans() {
    console.log('--- Database & Storage Audit ---');

    // 1. Check if deleted_at column exists by fetching one row
    const { data: testData, error: schemaError } = await supabase
        .from('inspections')
        .select('*')
        .limit(1);

    if (schemaError) {
        console.error('Schema Check Error:', schemaError);
    } else if (testData && testData.length > 0) {
        if ('deleted_at' in testData[0]) {
            console.log('[SCHEMA] "deleted_at" column EXISTS. Soft delete is ready.');
        } else {
            console.log('[SCHEMA] "deleted_at" column NOT FOUND. SQL migration is still needed.');
        }
    } else {
        console.log('[SCHEMA] No records found in DB to check schema via select *');
    }

    // 2. Count DB records
    const { count: dbCount } = await supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true });
    console.log(`[DB] Current registered records: ${dbCount}`);

    // 3. List Storage folders
    console.log('[STORAGE] Scanning for orphaned photo folders...');
    const { data: dateFolders, error: storageError } = await supabase.storage
        .from('inspections')
        .list();

    if (storageError) {
        console.error('Storage Error:', storageError);
        return;
    }

    // Get all registered folder_paths to compare
    const { data: dbItems } = await supabase
        .from('inspections')
        .select('folder_path');
    const dbPaths = new Set(dbItems?.map(i => i.folder_path).filter(Boolean) || []);

    let orphanedFolders = [];

    for (const dateFolder of dateFolders) {
        if (dateFolder.name === '.emptyFolderPlaceholder') continue;

        const { data: uuidFolders } = await supabase.storage
            .from('inspections')
            .list(dateFolder.name);

        if (uuidFolders) {
            for (const uuidFolder of uuidFolders) {
                if (uuidFolder.name === '.emptyFolderPlaceholder') continue;
                const fullPath = `${dateFolder.name}/${uuidFolder.name}`;
                if (!dbPaths.has(fullPath)) {
                    orphanedFolders.push(fullPath);
                }
            }
        }
    }

    if (orphanedFolders.length > 0) {
        console.log(`[RECOVERY] Found ${orphanedFolders.length} orphaned folders in storage:`);
        orphanedFolders.forEach(p => console.log(`   - ${p}`));
    } else {
        console.log('[RECOVERY] No orphaned data found. All storage files match DB records.');
    }
}

checkSchemaAndOrphans().catch(console.error);
