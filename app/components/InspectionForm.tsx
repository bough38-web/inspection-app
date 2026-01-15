'use client';
import { useState, useRef } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { compressImageClient } from '@/lib/clientCompress';

export function InspectionForm() {
    const [photos, setPhotos] = useState<File[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [form, setForm] = useState({
        branch: '',
        name: '',
        contract_no: '',
        business_name: '',
        activeCategory: '' as 'customer' | 'appearance' | 'system' | '',
        subItems: {
            customer_1: '',
            customer_2: '',
            appearance_1: '',
            appearance_2: '',
            system_1: '',
            system_2: '',
            system_3: ''
        }
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const branches = ['중앙', '강북', '서대문', '고양', '의정부', '남양주', '강릉', '원주'];

    const fillMockData = () => {
        setForm({
            branch: '중앙',
            name: '김철수',
            contract_no: '12345678',
            business_name: '테스트 상점',
            activeCategory: 'system',
            subItems: {
                customer_1: '양호',
                customer_2: '양호',
                appearance_1: '양호',
                appearance_2: '양호',
                system_1: '양호',
                system_2: '양호',
                system_3: '양호'
            }
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            // Limit to 3 photos total
            const totalFiles = photos.length + newFiles.length;
            if (totalFiles > 3) {
                alert('최대 3장까지만 업로드 가능합니다.');
                return;
            }

            // Compress images before adding to state
            const compressedFiles = await Promise.all(
                newFiles.map(file => compressImageClient(file))
            );

            setPhotos((prev) => [...prev, ...compressedFiles]);

            const newUrls = newFiles.map(file => URL.createObjectURL(file));
            setImageUrls(prev => [...prev, ...newUrls]);
        }
    };

    const removeImage = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    async function submit(e: React.FormEvent) {
        e.preventDefault();

        let isValid = false;
        let finalActivityType = '';

        if (!form.activeCategory) {
            alert('활동 종류(고객소통/외관점검/시스템점검)를 선택해주세요.');
            return;
        }

        // Validate based on active category
        if (form.activeCategory === 'customer') {
            if (form.subItems.customer_1 && form.subItems.customer_2) {
                isValid = true;
                finalActivityType = `[고객소통] 안부:${form.subItems.customer_1}, 보안:${form.subItems.customer_2}`;
            }
        } else if (form.activeCategory === 'appearance') {
            if (form.subItems.appearance_1 && form.subItems.appearance_2) {
                isValid = true;
                finalActivityType = `[외관점검] 표지판:${form.subItems.appearance_1}, 이물질:${form.subItems.appearance_2}`;
            }
        } else if (form.activeCategory === 'system') {
            if (form.subItems.system_1 && form.subItems.system_2 && form.subItems.system_3) {
                isValid = true;
                finalActivityType = `[시스템점검] 카메라:${form.subItems.system_1}, 리더기:${form.subItems.system_2}, 락:${form.subItems.system_3}`;
            }
        }

        if (!isValid || !form.branch || !form.name || !form.contract_no || !form.business_name) {
            alert('필수 항목을 모두 입력/선택해주세요.');
            return;
        }

        setLoading(true);
        const fd = new FormData();
        photos.forEach(p => fd.append('photos', p));

        fd.append('branch', form.branch);
        fd.append('name', form.name);
        fd.append('contract_no', form.contract_no);
        fd.append('business_name', form.business_name);
        fd.append('activity_type', finalActivityType);

        // Flag to tell server to mock the DB if needed
        fd.append('mock_mode', 'true');

        try {
            // Sending submission to Supabase
            const res = await fetch('/api/submit', { method: 'POST', body: fd });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Server Error: ${res.status}`);
            }

            // Save to LocalStorage for Admin Demo
            const newInspection = {
                id: Date.now().toString(),
                created_at: new Date().toISOString(),
                ...form,
                activity_type: finalActivityType,
                photo_count: photos.length
            };
            const existing = JSON.parse(localStorage.getItem('mock_inspections') || '[]');
            localStorage.setItem('mock_inspections', JSON.stringify([newInspection, ...existing]));

            setSubmitted(true);
            // Reset form
            setForm({
                branch: '',
                name: '',
                contract_no: '',
                business_name: '',
                activeCategory: '',
                subItems: {
                    customer_1: '',
                    customer_2: '',
                    appearance_1: '',
                    appearance_2: '',
                    system_1: '',
                    system_2: '',
                    system_3: ''
                }
            });
            setPhotos([]);
            setImageUrls([]);
        } catch (err: any) {
            setErrorMessage(err.message || '알 수 없는 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }

    if (submitted) {
        return (
            <div className="w-full max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">접수 완료!</h2>
                    <p className="text-gray-600 mt-2">현장 점검 내용이 성공적으로 등록되었습니다.</p>
                </div>
                <Button onClick={() => setSubmitted(false)} variant="secondary" className="w-full">
                    추가 등록하기
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="w-full max-w-md mx-auto space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">현장 점검 등록 <span className="text-sm text-blue-500 font-normal">(v2.0 New)</span></h2>
                    <button
                        type="button"
                        onClick={fillMockData}
                        className="text-xs text-blue-500 hover:text-blue-700 underline"
                    >
                        샘플 데이터 채우기
                    </button>
                </div>

                {errorMessage && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm break-keep">
                        <b>오류 발생:</b><br />{errorMessage}
                    </div>
                )}

                <div className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-gray-700">지사 선택</label>
                    <select
                        value={form.branch}
                        onChange={e => setForm({ ...form, branch: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                    >
                        <option value="">지사를 선택하세요</option>
                        {branches.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                </div>

                <Input
                    label="담당자 이름"
                    placeholder="홍길동"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                />
                <Input
                    label="계약번호 (8자리)"
                    placeholder="12345678"
                    value={form.contract_no}
                    maxLength={8}
                    onChange={e => setForm({ ...form, contract_no: e.target.value })}
                />
                <Input
                    label="상호명"
                    placeholder="(주)우리회사"
                    value={form.business_name}
                    onChange={e => setForm({ ...form, business_name: e.target.value })}
                />

                <div className="p-4 bg-gray-50 rounded-lg space-y-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-2">활동 내역 상세</h3>

                    {/* Category Buttons */}
                    <div className="flex space-x-2 mb-4">
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, activeCategory: 'customer' })}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${form.activeCategory === 'customer'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            고객소통
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, activeCategory: 'appearance' })}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${form.activeCategory === 'appearance'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            외관점검
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, activeCategory: 'system' })}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${form.activeCategory === 'system'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            시스템점검
                        </button>
                    </div>

                    {/* Dynamic Content based on Active Category */}
                    {form.activeCategory === 'customer' && (
                        <div className="space-y-3 animate-fadeIn">
                            <div className="flex flex-col space-y-1">
                                <label className="text-sm font-medium text-gray-700">1. 안부인사 및 불편사항 점검</label>
                                <select
                                    value={form.subItems.customer_1}
                                    onChange={e => setForm({ ...form, subItems: { ...form.subItems, customer_1: e.target.value } })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors bg-white text-sm"
                                >
                                    <option value="">상태 선택</option>
                                    <option value="양호">양호</option>
                                    <option value="조치필요">조치필요</option>
                                    <option value="해당없음">해당없음</option>
                                </select>
                            </div>
                            <div className="flex flex-col space-y-1">
                                <label className="text-sm font-medium text-gray-700">2. 보안 이슈 사전 청취</label>
                                <select
                                    value={form.subItems.customer_2}
                                    onChange={e => setForm({ ...form, subItems: { ...form.subItems, customer_2: e.target.value } })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors bg-white text-sm"
                                >
                                    <option value="">상태 선택</option>
                                    <option value="양호">양호</option>
                                    <option value="조치필요">조치필요</option>
                                    <option value="해당없음">해당없음</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {form.activeCategory === 'appearance' && (
                        <div className="space-y-3 animate-fadeIn">
                            <div className="flex flex-col space-y-1">
                                <label className="text-sm font-medium text-gray-700">1. 표지판(스티커) 교체</label>
                                <select
                                    value={form.subItems.appearance_1}
                                    onChange={e => setForm({ ...form, subItems: { ...form.subItems, appearance_1: e.target.value } })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors bg-white text-sm"
                                >
                                    <option value="">상태 선택</option>
                                    <option value="양호">양호</option>
                                    <option value="조치필요">조치필요</option>
                                    <option value="해당없음">해당없음</option>
                                </select>
                            </div>
                            <div className="flex flex-col space-y-1">
                                <label className="text-sm font-medium text-gray-700">2. 장비 이물질 제거(환경개선)</label>
                                <select
                                    value={form.subItems.appearance_2}
                                    onChange={e => setForm({ ...form, subItems: { ...form.subItems, appearance_2: e.target.value } })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors bg-white text-sm"
                                >
                                    <option value="">상태 선택</option>
                                    <option value="양호">양호</option>
                                    <option value="조치필요">조치필요</option>
                                    <option value="해당없음">해당없음</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {form.activeCategory === 'system' && (
                        <div className="space-y-3 animate-fadeIn">
                            <div className="flex flex-col space-y-1">
                                <label className="text-sm font-medium text-gray-700">1. 카메라 정상 작동 확인</label>
                                <select
                                    value={form.subItems.system_1}
                                    onChange={e => setForm({ ...form, subItems: { ...form.subItems, system_1: e.target.value } })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors bg-white text-sm"
                                >
                                    <option value="">상태 선택</option>
                                    <option value="양호">양호</option>
                                    <option value="조치필요">조치필요</option>
                                    <option value="해당없음">해당없음</option>
                                </select>
                            </div>
                            <div className="flex flex-col space-y-1">
                                <label className="text-sm font-medium text-gray-700">2. 영상저장장치 리더기 점검</label>
                                <select
                                    value={form.subItems.system_2}
                                    onChange={e => setForm({ ...form, subItems: { ...form.subItems, system_2: e.target.value } })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors bg-white text-sm"
                                >
                                    <option value="">상태 선택</option>
                                    <option value="양호">양호</option>
                                    <option value="조치필요">조치필요</option>
                                    <option value="해당없음">해당없음</option>
                                </select>
                            </div>
                            <div className="flex flex-col space-y-1">
                                <label className="text-sm font-medium text-gray-700">3. 락 정상 작동여부 확인</label>
                                <select
                                    value={form.subItems.system_3}
                                    onChange={e => setForm({ ...form, subItems: { ...form.subItems, system_3: e.target.value } })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors bg-white text-sm"
                                >
                                    <option value="">상태 선택</option>
                                    <option value="양호">양호</option>
                                    <option value="조치필요">조치필요</option>
                                    <option value="해당없음">해당없음</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {!form.activeCategory && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                            상단 버튼을 눌러 점검 항목을 선택해주세요.
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">현장 사진 (최대 3장)</label>
                    <div className="grid grid-cols-3 gap-2">
                        {imageUrls.map((url, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-gray-200">
                                <img src={url} alt="preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    삭제
                                </button>
                            </div>
                        ))}
                        {imageUrls.length < 3 && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                            >
                                +
                            </button>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        // multiple Removed to make it easier to control count, or keep it but slice?
                        // Let's keep multiple but check count in handler
                        multiple
                        onChange={handleImageUpload}
                    />
                    <p className="text-xs text-gray-500">최대 3장까지만 등록 가능합니다.</p>
                </div>
            </div>

            <Button type="submit" loading={loading} className="w-full h-12 text-lg">
                제출하기
            </Button>
        </form>
    );
}
