const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.production') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeTimestamps() {
    console.log('--- Timestamp Analysis ---');

    const { data: records, error } = await supabase
        .from('inspections')
        .select('created_at, business_name')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching records:', error);
        return;
    }

    console.log(`Total records in DB: ${records.length}`);

    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter(r => r.created_at.startsWith(today));

    console.log(`Records created today (${today}): ${todayRecords.length}`);

    if (records.length > 0) {
        console.log('Latest 5 records:');
        records.slice(0, 5).forEach(r => {
            console.log(` - ${r.created_at} | ${r.business_name} | Deleted: ${r.deleted_at || 'No'}`);
        });
    }
}

analyzeTimestamps().catch(console.error);
