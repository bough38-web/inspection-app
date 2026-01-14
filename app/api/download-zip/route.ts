import JSZip from 'jszip';
import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  try {
    console.log('Download Request ID:', id);

    // 1. Find Record from Supabase
    const { data: record, error } = await adminSupabase
      .from('inspections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !record) {
      console.log('Record not found for ID:', id, error);
      return new NextResponse('Not Found', { status: 404 });
    }

    console.log('Record found:', record.folder_path);

    // 2. Create ZIP
    const zip = new JSZip();

    // Try to download photos 1 to 10 (assuming max 10 photos or use photo_count)
    // In a real robust app, we'd list files in the bucket folder
    // For now, let's assume standard naming 1.webp, 2.webp etc.
    const count = record.photo_count || 5;

    for (let i = 1; i <= count; i++) {
      try {
        const { data } = await adminSupabase.storage
          .from('inspections')
          .download(`${record.folder_path}/${i}.webp`);

        if (data) {
          const buffer = await data.arrayBuffer();
          zip.file(`${record.folder_path}/${i}.webp`, Buffer.from(buffer));
          console.log('Added file:', i);
        }
      } catch (e) {
        console.log('File not found or error:', i);
      }
    }

    console.log('Generating Zip...');
    const content = await zip.generateAsync({ type: 'nodebuffer' });
    console.log('Zip size:', content.length);

    return new NextResponse(content as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=${encodeURIComponent(record.contract_no)}_${encodeURIComponent(record.business_name)}.zip`
      }
    });

  } catch (e) {
    console.error('ZIP ERROR:', e);
    return NextResponse.json({ error: String(e), stack: (e as Error).stack }, { status: 500 });
  }
}
