'use client';
import { useState, useRef } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export function InspectionForm() {
    const [photos, setPhotos] = useState<File[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState({
        branch: '',
        name: '',
        contract_no: '',
        business_name: ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const branches = ['중앙', '강북', '서대문', '고양', '의정부', '남양주', '강릉', '원주'];

    const fillMockData = () => {
        setForm({
            branch: '중앙',
            name: '김철수',
            contract_no: '12345678',
            business_name: '테스트 상점'
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setPhotos(prev => [...prev, ...newFiles]);

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
        if (!form.branch || !form.name || !form.contract_no || !form.business_name) {
            alert('모든 필드(지사 포함)를 입력해주세요.');
            return;
        }

        setLoading(true);
        const fd = new FormData();
        photos.forEach(p => fd.append('photos', p));
        Object.keys(form).forEach(k => fd.append(k, (form as any)[k]));

        // Flag to tell server to mock the DB if needed
        fd.append('mock_mode', 'true');

        try {
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
                business_name: ''
            });
            setPhotos([]);
            setImageUrls([]);
        } catch (err: any) {
            alert(`제출 실패: ${err.message}`);
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
                    <h2 className="text-xl font-bold text-gray-800">현장 점검 등록</h2>
                    <button
                        type="button"
                        onClick={fillMockData}
                        className="text-xs text-blue-500 hover:text-blue-700 underline"
                    >
                        샘플 데이터 채우기
                    </button>
                </div>

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

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">현장 사진</label>
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
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                        >
                            +
                        </button>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                    />
                    <p className="text-xs text-gray-500">최소 1장 이상의 사진을 등록해주세요.</p>
                </div>
            </div>

            <Button type="submit" loading={loading} className="w-full h-12 text-lg">
                제출하기
            </Button>
        </form>
    );
}
