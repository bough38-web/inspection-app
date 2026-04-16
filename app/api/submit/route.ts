import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase';
import sharp from 'sharp';
import { encrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // 기본 관리 정보
    const branch = formData.get('branch') as string;
    const name = formData.get('name') as string;
    const contract_no = (formData.get('contract_no') as string) || '';
    const business_name = formData.get('business_name') as string;

    // [New] 재고 관리 전문 필드
    const transaction_type = formData.get('transaction_type') as string;
    const item_name = formData.get('item_name') as string;
    const item_code = formData.get('item_code') as string;
    const quantity = parseInt(formData.get('quantity') as string) || 1;
    const condition_status = formData.get('condition_status') as string;
    const remarks = formData.get('remarks') as string;
    const activity_type = formData.get('activity_type') as string; // 하위 호환성 유지

    const files = formData.getAll('photos') as File[];

    if (!branch && !business_name) {
      return NextResponse.json({ error: '지사 또는 현장명이 필요합니다.' }, { status: 400 });
    }

    // 폴더 경로 생성 (날짜/랜덤ID)
    const dateFolder = new Date().toISOString().slice(0, 10);
    const folderUuid = Math.random().toString(36).substring(2, 15);
    const folderPath = `${dateFolder}/${folderUuid}`;

    // DB 데이터 준비 (SQL로 추가한 컬럼들 매핑)
    const inspectionData = {
      created_at: new Date().toISOString(),
      branch,
      name,
      contract_no,
      business_name: business_name ? encrypt(business_name) : null,
      activity_type,
      transaction_type,
      item_name,
      item_code,
      quantity,
      condition_status,
      remarks,
      photo_count: files.length,
      folder_path: folderPath,
    };

    const { data: insertData, error: insertError } = await adminSupabase
      .from('inspections')
      .insert([inspectionData])
      .select();

    if (insertError) {
      console.error("Supabase Insert Error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 이미지 처리 및 업로드 (Sharp 사용)
    const uploadPromises = files.map(async (file, index) => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const compressedBuffer = await sharp(buffer)
        .rotate()
        .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
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

