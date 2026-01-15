import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase'; // Use Admin Client for Storage & DB
import sharp from 'sharp';
import { encrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    console.log("Submit API Called"); // Debug Log

    const formData = await req.formData();
    const dataStr = formData.get('data') as string;

    if (!dataStr) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const data = JSON.parse(dataStr);
    const files = formData.getAll('images') as File[];

    console.log("Received Data:", data); // Debug Log
    console.log("Received Files:", files.length); // Debug Log

    // --- 1. Folder Path Generation (UUID for Safety) ---
    // Use Random UUID for folder to prevent "Invalid key" errors with Korean/Special Chars
    const dateFolder = new Date().toISOString().slice(0, 10);
    // Simple random string logic for "UUID-like" behavior without external lib
    const folderUuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const folderPath = `${dateFolder}/${folderUuid}`;

    console.log("Storage Path:", folderPath);

    // --- 2. Database Insert (With Encryption) ---
    const inspectionData = {
      created_at: new Date().toISOString(),
      branch: data.branch,
      name: data.name,
      contract_no: data.contract_no,
      business_name: encrypt(data.business_name), // Encrypt here!
      activity_type: data.activity_type,
      photo_count: files.length,
      folder_path: folderPath, // Store the UUID path
      sub_items: data.sub_items || {}
    };

    const { data: insertData, error: insertError } = await adminSupabase
      .from('inspections')
      .insert([inspectionData])
      .select();

    if (insertError) {
      console.error("Supabase Insert Error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log("DB Insert Success:", insertData);

    // --- 3. Image Upload (Server-Side) ---
    // Note: Images are already compressed client-side, but we can do a safety pass or format const conversion server-side if needed.
    // For speed, since client sends webp/blob, we just upload them.

    const uploadPromises = files.map(async (file, index) => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Ensure WebP format (Double safety, or simple pass-through)
      // If the client sends 'blob' named 'image.png', we might want to normalize extension.
      // Client code sends `photos` which are Blobs.

      // Let's use Sharp to standardize to highly compressed WebP 
      // incase Client compression was bypassed or insufficient.
      const compressedBuffer = await sharp(buffer)
        .rotate() // Auto-rotate phone photos
        .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70 })
        .toBuffer();

      const fileName = `${index + 1}.webp`; // 1.webp, 2.webp...
      const fullPath = `${folderPath}/${fileName}`;

      const { error: uploadError } = await adminSupabase.storage
        .from('inspections')
        .upload(fullPath, compressedBuffer, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadError) {
        console.error(`Upload Error (${fileName}):`, uploadError);
        throw uploadError;
      }
    });

    await Promise.all(uploadPromises);

    return NextResponse.json({ success: true, id: insertData[0].id });

  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
