import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase';
import JSZip from 'jszip';
import { decrypt } from '@/lib/encryption';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return new NextResponse('ID missing', { status: 400 });

  try {
    // Fetch Metadata
    const { data: record, error } = await adminSupabase
      .from('inspections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !record) return new NextResponse('Record not found', { status: 404 });

    const businessName = decrypt(record.business_name); // Decrypt!
    const folderPath = record.folder_path;

    if (!folderPath) return new NextResponse('No photos found', { status: 404 });

    // List files in Storage
    const { data: files, error: listError } = await adminSupabase.storage
      .from('inspections')
      .list(folderPath);

    if (listError || !files || files.length === 0) {
      return new NextResponse('No files in storage', { status: 404 });
    }

    const zip = new JSZip();

    // Use a safe folder name for the ZIP content
    // Sanitize businessName just in case it has weird chars even after decryption
    const safeName = businessName.replace(/[\\/:*?"<>|]/g, '_');
    const zipFolder = zip.folder(`${record.contract_no}_${safeName}`);

    // Download each file
    const downloads = files.map(async (file) => {
      const { data: blob, error: dlError } = await adminSupabase.storage
        .from('inspections')
        .download(`${folderPath}/${file.name}`);

      if (!dlError && blob && zipFolder) {
        const arrayBuffer = await blob.arrayBuffer();
        zipFolder.file(file.name, arrayBuffer);
      }
    });

    await Promise.all(downloads);

    const zipContent = await zip.generateAsync({ type: 'blob' });
    const buffer = await zipContent.arrayBuffer(); // Convert Blob to ArrayBuffer for Response

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(safeName)}_photos.zip"`
      }
    });

  } catch (e) {
    console.error('ZIP Error:', e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
