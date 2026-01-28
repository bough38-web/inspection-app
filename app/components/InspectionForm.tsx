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

    const branches = ['중앙지사', '강북지사', '서대문지사', '고양지사', '의정부지사', '남양주지사', '강릉지사', '원주지사'];

    const fillMockData = () => {
        setForm({
            branch: '중앙지사',
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
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]; // Take only the first file

            // Limit to 3 photos total
            const totalFiles = photos.length + 1;
            if (totalFiles > 3) {
                alert('최대 3장까지만 업로드 가능합니다.');
                return;
            }

            // Compress image
            const compressedFile = await compressImageClient(file);
            const newUrl = URL.createObjectURL(file);

            setPhotos((prev) => [...prev, compressedFile]);
            setImageUrls(prev => [...prev, newUrl]);

            // Auto-trigger next capture if less than 3
            if (totalFiles < 3) {
                // Short delay to allow UI update and prevent browser blocking
                setTimeout(() => {
                    if (fileInputRef.current) {
                        fileInputRef.current.value = ''; // Reset input
                        fileInputRef.current.click();
                    }
                }, 500);
            }
        }
    };

    const removeImage = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    async function submit(e: React.FormEvent) {
        e.preventDefault();

        let finalParts: string[] = [];

        // Collect all valid categories
        if (form.subItems.customer_1 && form.subItems.customer_2) {
            finalParts.push(`[고객소통] 안부:${form.subItems.customer_1}, 보안:${form.subItems.customer_2}`);
        }
        if (form.subItems.appearance_1 && form.subItems.appearance_2) {
            finalParts.push(`[외관점검] 표지판:${form.subItems.appearance_1}, 이물질:${form.subItems.appearance_2}`);
        }
        if (form.subItems.system_1 && form.subItems.system_2 && form.subItems.system_3) {
            finalParts.push(`[시스템점검] 카메라:${form.subItems.system_1}, 리더기:${form.subItems.system_2}, 락:${form.subItems.system_3}`);
        }

        if (finalParts.length === 0) {
            alert('최소 하나 이상의 활동 내역을 완성해주세요.');
            return;
        }

        if (!form.branch || !form.name || !form.business_name) {
            alert('지사, 담당자, 상호명을 모두 입력해주세요.');
            return;
        }

        const finalActivityType = finalParts.join(' ');

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
        <form
            onSubmit={submit}
            className="w-full max-w-md mx-auto space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-gray-100"
            onPaste={(e) => e.preventDefault()} // Block paste
        >
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

                {/* Contract Number removed as per request, but kept in state as empty for compatibility */}

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
                        {[
                            { id: 'customer', label: '고객소통', isComplete: !!(form.subItems.customer_1 && form.subItems.customer_2) },
                            { id: 'system', label: '시스템점검', isComplete: !!(form.subItems.system_1 && form.subItems.system_2 && form.subItems.system_3) },
                            { id: 'appearance', label: '외관점검', isComplete: !!(form.subItems.appearance_1 && form.subItems.appearance_2) },
                        ].map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setForm({ ...form, activeCategory: cat.id as any })}
                                className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border-2 ${form.activeCategory === cat.id
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-200'
                                    }`}
                            >
                                <span className="flex items-center gap-1">
                                    {cat.label}
                                    {cat.isComplete && (
                                        <svg className="w-3.5 h-3.5 text-green-500 fill-current" viewBox="0 0 20 20">
                                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                                        </svg>
                                    )}
                                </span>
                            </button>
                        ))}
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
                                    <option value="조치완료">조치완료</option>
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
                                    <option value="조치완료">조치완료</option>
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
                                    <option value="조치완료">조치완료</option>
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
                                    <option value="조치완료">조치완료</option>
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
                                    <option value="조치완료">조치완료</option>
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
                                    <option value="조치완료">조치완료</option>
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
                                    <option value="조치완료">조치완료</option>
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

                {form.activeCategory === 'appearance' && (
                    <div className="space-y-2 animate-fadeIn">
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
                            capture="environment" // Prefer rear camera
                            onChange={handleImageUpload}
                        />
                        <p className="text-xs text-gray-500">최대 3장까지만 등록 가능합니다.</p>
                    </div>
                )}
            </div>

            <Button type="submit" loading={loading} className="w-full h-12 text-lg">
                제출하기
            </Button>
        </form>
    );
}
