import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageCompress';
import { validateForm } from '@/lib/validators';

export async function POST(req: Request) {
  console.log('[Debug] Supabase Config Check:');
  console.log('- URL:', process.env.NEXT_PUBLIC_SUPABASE_URL); // Is this the NEW url?
  console.log('- Service Key Loaded:', !!process.env.SUPABASE_SERVICE_ROLE_KEY); // Is this true?

  const form = await req.formData();
  const photos = form.getAll('photos') as File[];

  const data = {
    branch: form.get('branch') as string,
    name: form.get('name') as string,
    contract_no: form.get('contract_no') as string,
    business_name: form.get('business_name') as string,
    photos
  };

  const today = new Date();
  const dateFolder = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  // Sanitize folder names to prevent "Invalid key" errors (replace spaces with underscores, and encode for S3)
  const safeBusinessName = encodeURIComponent(data.business_name.replace(/\s+/g, '_'));
  const safeContractNo = data.contract_no.replace(/\s+/g, '');
  const safeBranch = encodeURIComponent(data.branch);
  const relativePath = `${dateFolder}/${safeBranch}/${safeContractNo}_${safeBusinessName}`;

  try {
    validateForm(data);

    // 1. Insert into Supabase Database
    const { data: row, error: insertError } = await adminSupabase
      .from('inspections')
      .insert({
        branch: data.branch,
        name: data.name,
        contract_no: data.contract_no,
        business_name: data.business_name,
        // Make sure to create this column: alter table inspections add column activity_type text;
        activity_type: form.get('activity_type'),
        status: 'submitted',
        folder_path: relativePath,
        photo_count: photos.length
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Upload Photos to Supabase Storage
    for (let i = 0; i < photos.length; i++) {
      const buffer = Buffer.from(await photos[i].arrayBuffer());
      const compressed = await compressImage(buffer);

      const { error: uploadError } = await adminSupabase.storage
        .from('inspections')
        .upload(`${relativePath}/${i + 1}.webp`, compressed, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Submission failed:', error);
    // @ts-ignore
    return NextResponse.json({ ok: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
}
