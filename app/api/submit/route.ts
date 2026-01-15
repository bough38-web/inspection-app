import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase'; // Use Admin Client for Storage & DB
import sharp from 'sharp';
import { encrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    console.log("Submit API Called"); // Debug Log

    const formData = await req.formData();

    // Debug: Log all keys to enable easier debugging
    console.log("FormData Keys:", Array.from(formData.keys()));

    // Parse individual fields (Frontend sends them directly, NOT as a 'data' JSON string)
    const branch = formData.get('branch') as string;
    const name = formData.get('name') as string;
    const contract_no = formData.get('contract_no') as string;
    const business_name = formData.get('business_name') as string;

    // Special Handling for 'activity_type': Frontend might send it as string or logic might differ
    // Based on InspectionForm, it sends 'activeCategory' or 'activity_type' ? 
    // Let's check keys. Usually it's appended one by one. 
    // Assuming your frontend sends 'activity_type' if you checked it in previous steps.
    // Wait, looking at InspectionForm.tsx viewed previously:
    // It appends: form.append('branch', ...), form.append('activity_type', ...)
    const activity_type = formData.get('activity_type') as string;

    // Sub Items: These are trickier if not JSON. 
    // If frontend sends `subItems` as JSON string, we parse it.
    // If frontend sends flat keys (e.g. subItems[customer_1]), accessing might be hard.
    // Let's assume for now it sends a JSON string for `sub_items` OR we just don't strictly require it if it's missing.
    // Looking at typical FormData usage, complex objects are often stringified.
    let sub_items = {};
    const subItemsRaw = formData.get('subItems');
    if (subItemsRaw && typeof subItemsRaw === 'string') {
      try {
        sub_items = JSON.parse(subItemsRaw);
      } catch (e) {
        console.log("Failed to parse subItems JSON", e);
      }
    }

    const files = formData.getAll('photos') as File[]; // Frontend uses 'photos'

    if (!branch || !contract_no) {
      return NextResponse.json({ error: 'Missing required fields (branch, contract_no)' }, { status: 400 });
    }

    console.log(`Processing: ${branch} / ${contract_no} / Photos: ${files.length}`);

    // --- 1. Folder Path Generation (UUID for Safety) ---
    const dateFolder = new Date().toISOString().slice(0, 10);
    const folderUuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const folderPath = `${dateFolder}/${folderUuid}`;

    // --- 2. Database Insert (With Encryption) ---
    const inspectionData = {
      created_at: new Date().toISOString(),
      branch,
      name,
      contract_no,
      business_name: encrypt(business_name), // Encrypt here!
      activity_type,
      photo_count: files.length,
      folder_path: folderPath,
      // sub_items: sub_items // Column missing in DB, commented out to fix error
    };

    const { data: insertData, error: insertError } = await adminSupabase
      .from('inspections')
      .insert([inspectionData])
      .select();

    if (insertError) {
      console.error("Supabase Insert Error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // --- 3. Image Upload ---
    const uploadPromises = files.map(async (file, index) => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Re-compress/Standardize to WebP using Sharp
      const compressedBuffer = await sharp(buffer)
        .rotate()
        .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70 })
        .toBuffer();

      const fileName = `${index + 1}.webp`;
      const fullPath = `${folderPath}/${fileName}`;

      const { error: uploadError } = await adminSupabase.storage
        .from('inspections')
        .upload(fullPath, compressedBuffer, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadError) throw uploadError;
    });

    await Promise.all(uploadPromises);

    return NextResponse.json({ success: true, id: insertData[0].id });

  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
