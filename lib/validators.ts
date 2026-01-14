export function validateForm(data: any) {
  if (!data.name) throw new Error('이름 필수');
  if (!data.photos || data.photos.length !== 5)
    throw new Error('사진 5장 필수');

  if (data.contract_no) {
    if (!/^\d{8}$/.test(data.contract_no))
      throw new Error('계약번호 8자리');
  } else if (!data.business_name) {
    throw new Error('계약번호 또는 상호 필수');
  }
}
