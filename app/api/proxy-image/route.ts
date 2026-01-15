import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    if (!path) {
        return NextResponse.json({ error: 'Path required' }, { status: 400 });
    }

    try {
        const { data, error } = await adminSupabase.storage
            .from('inspections')
            .download(path);

        if (error) {
            console.error('Storage download error:', error);
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        const buffer = await data.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'image/webp',
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
