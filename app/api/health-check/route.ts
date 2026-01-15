import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    // 1. Check for invisible characters (whitespace, newlines)
    const urlHasWhitespace = /\s/.test(url);
    const keyHasWhitespace = /\s/.test(serviceKey);

    // 2. Raw Connectivity Test (bypass Supabase Client to isolate network issues)
    let rawConnectionTest = 'Not Attempted';
    try {
        if (url && !urlHasWhitespace) {
            // Try to hit the Supabase REST endpoint directly
            const response = await fetch(`${url}/rest/v1/`, {
                method: 'HEAD',
                headers: { 'apikey': serviceKey }
            });
            rawConnectionTest = `Status: ${response.status} (${response.statusText})`;
        } else {
            rawConnectionTest = 'Skipped (URL missing or dirty)';
        }
    } catch (e: any) {
        rawConnectionTest = `Failed: ${e.message}`;
        if (e.cause) rawConnectionTest += ` (Cause: ${e.cause})`;
    }

    // 3. Client Test
    let clientTest = 'Not Attempted';
    try {
        if (url && serviceKey && !urlHasWhitespace && !keyHasWhitespace) {
            const adminClient = createClient(url, serviceKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });
            const { data, error } = await adminClient.storage.listBuckets();
            if (error) throw error;
            clientTest = 'Success: ' + (data?.length || 0) + ' buckets found';
        } else {
            clientTest = 'Skipped (Env Vars dirty)';
        }
    } catch (e: any) {
        clientTest = `Failed: ${e.message}`;
    }

    return NextResponse.json({
        diagnosis: {
            url_dirty: urlHasWhitespace ? "DETECTED! (Remove spaces)" : "Clean",
            key_dirty: keyHasWhitespace ? "DETECTED! (Remove spaces)" : "Clean",
            raw_connection: rawConnectionTest,
            client_connection: clientTest
        },
        env_preview: {
            url_start: url.substring(0, 10),
            url_end: url.substring(url.length - 5),
            key_start: serviceKey.substring(0, 5),
            url_length: url.length
        },
        version: "v2.3-deep-diagnostic",
        timestamp: new Date().toISOString()
    });
}
