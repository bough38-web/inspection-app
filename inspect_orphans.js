const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.production') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectOrphans() {
    const orphanedFolders = [
        '2026-02-27/mmwzy1ld05olzvrl2x4xbg',
        '2026-03-11/h26gb8fbspgkv8r1ikbdb'
    ];

    for (const folder of orphanedFolders) {
        console.log(`--- Inspecting folder: ${folder} ---`);
        const { data: files, error } = await supabase.storage
            .from('inspections')
            .list(folder);

        if (error) {
            console.error(`Error listing ${folder}:`, error);
            continue;
        }

        if (files) {
            console.log(`Found ${files.length} files:`);
            files.forEach(f => {
                console.log(`   - ${f.name} (${f.metadata.size} bytes)`);
            });
        }
    }
}

inspectOrphans().catch(console.error);
