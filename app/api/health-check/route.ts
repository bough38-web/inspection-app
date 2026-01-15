import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        return NextResponse.json({
            status: 'Error',
            message: 'Missing Env Vars',
            debug: {
                url: !!url,
                serviceKey: !!serviceKey
            }
        });
    }

    try {
        // Attempt to connect using the Service Key
        const adminClient = createClient(url, serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const { data: buckets, error } = await adminClient.storage.listBuckets();

        if (error) {
            console.error('Storage List Error:', error);
            throw error;
        }

        return NextResponse.json({
            status: 'OK',
            message: 'Connection Successful',
            version: 'v2.2-enhanced-check',
            bucket_list: buckets ? buckets.map(b => b.name) : [],
            target_bucket_exists: buckets ? buckets.some(b => b.name === 'inspections') : false,
            // Show first 5 chars to verify if it matches user's dashboard (e.g. eyJhb...)
            key_preview: serviceKey.substring(0, 5) + '...'
        });

    } catch (error: any) {
        return NextResponse.json({
            status: 'Connection Failed',
            error: error.message || JSON.stringify(error),
            hint: 'This usually means the SUPABASE_SERVICE_ROLE_KEY is invalid (e.g. you used the anon key instead of service_role).'
        }, { status: 500 });
    }
}
