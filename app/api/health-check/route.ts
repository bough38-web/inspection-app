import { NextResponse } from 'next/server';

// NOTE: DO NOT import @/lib/supabase here, to avoid crashing if it fails to initialize.
// We want this route to survive to tell us WHAT is missing.

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const status = {
        supabase_configured: !!(url && anonKey && serviceKey),
        version: 'v2.1-health-check', // Version tag to confirm deployment
        env_check: {
            NEXT_PUBLIC_SUPABASE_URL: url ? `${url.substring(0, 20)}...` : 'MISSING',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? 'PRESENT (Hidden)' : 'MISSING',
            SUPABASE_SERVICE_ROLE_KEY: serviceKey ? 'PRESENT (Hidden)' : 'MISSING',
        },
        timestamp: new Date().toISOString()
    };

    return NextResponse.json(status);
}
