'use client';
import React, { useState, useRef } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { compressImageClient } from '@/lib/clientCompress';

export function InspectionForm() {
    const [photos, setPhotos] = useState<File[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [theme, setTheme] = useState<'modern-light' | 'premium-dark'>('modern-light');
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

    const setAllActionComplete = () => {
        if (!form.activeCategory) return;
        const newSubItems = { ...form.subItems };
        if (form.activeCategory === 'customer') {
            newSubItems.customer_1 = '조치완료';
            newSubItems.customer_2 = '조치완료';
        } else if (form.activeCategory === 'appearance') {
            newSubItems.appearance_1 = '조치완료';
            newSubItems.appearance_2 = '조치완료';
        } else if (form.activeCategory === 'system') {
            newSubItems.system_1 = '조치완료';
            newSubItems.system_2 = '조치완료';
            newSubItems.system_3 = '조치완료';
        }
        setForm({ ...form, subItems: newSubItems });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            const totalFiles = photos.length + 1;
            if (totalFiles > 3) {
                alert('최대 3장까지만 업로드 가능합니다.');
                return;
            }

            const compressedFile = await compressImageClient(file);
            const newUrl = URL.createObjectURL(file);

            setPhotos((prev) => [...prev, compressedFile]);
            setImageUrls(prev => [...prev, newUrl]);

            if (totalFiles < 3) {
                setTimeout(() => {
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                        fileInputRef.current.click();
                    }
                }, 300);
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

        if (form.subItems.customer_1 || form.subItems.customer_2) {
            finalParts.push(`[고객소통] 안부:${form.subItems.customer_1 || '-'}, 보안:${form.subItems.customer_2 || '-'}`);
        }
        if (form.subItems.appearance_1 || form.subItems.appearance_2) {
            finalParts.push(`[외관점검] 표지판:${form.subItems.appearance_1 || '-'}, 이물질:${form.subItems.appearance_2 || '-'}`);
        }
        if (form.subItems.system_1 || form.subItems.system_2 || form.subItems.system_3) {
            finalParts.push(`[시스템점검] 카메라:${form.subItems.system_1 || '-'}, 리더기:${form.subItems.system_2 || '-'}, 락:${form.subItems.system_3 || '-'}`);
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
        fd.append('mock_mode', 'true');

        try {
            const res = await fetch('/api/submit', { method: 'POST', body: fd });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Server Error: ${res.status}`);
            }

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
        <div className={`min-h-screen transition-colors duration-500 py-6 px-4 ${theme === 'premium-dark' ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
            <form
                onSubmit={submit}
                className={`w-full max-w-lg mx-auto space-y-6 p-8 rounded-[2.5rem] shadow-2xl transition-all duration-500 border ${theme === 'premium-dark'
                    ? 'bg-slate-900/80 backdrop-blur-xl border-slate-700/50 text-white'
                    : 'bg-white/90 backdrop-blur-xl border-white/20 text-gray-800'
                    }`}
                onPaste={(e) => e.preventDefault()}
            >
                {/* Theme Switcher */}
                <div className="flex justify-end space-x-2 -mt-2 mb-2">
                    <button
                        type="button"
                        onClick={() => setTheme('modern-light')}
                        className={`p-2 rounded-full transition-all ${theme === 'modern-light' ? 'bg-blue-100 text-blue-600 scale-110 shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}
                        title="Modern Light Theme"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4-9H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 17.657l.707.707M7.05 7.05l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTheme('premium-dark')}
                        className={`p-2 rounded-full transition-all ${theme === 'premium-dark' ? 'bg-indigo-900 text-indigo-300 scale-110 shadow-sm' : 'text-gray-400 hover:bg-slate-800'}`}
                        title="Premium Dark Theme"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                    </button>
                </div>

                <div className="flex justify-between items-center mb-2 px-1">
                    <div className="space-y-1">
                        <h2 className={`text-2xl font-black tracking-tight ${theme === 'premium-dark' ? 'text-white' : 'text-slate-800'}`}>
                            현장 점검 등록
                        </h2>
                        <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'premium-dark' ? 'text-blue-400' : 'text-blue-600'}`}>v2.0 Premium</p>
                    </div>
                    <button
                        type="button"
                        onClick={fillMockData}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${theme === 'premium-dark'
                            ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-blue-400'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                            }`}
                    >
                        샘플 데이터
                    </button>
                </div>

                {errorMessage && (
                    <div className={`p-4 rounded-2xl text-sm break-keep border animate-shake ${theme === 'premium-dark'
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                        <b className="font-bold">오류:</b> {errorMessage}
                    </div>
                )}

                <div className="flex flex-col space-y-2">
                    <label className={`text-sm font-bold ml-1 ${theme === 'premium-dark' ? 'text-slate-400' : 'text-slate-600'}`}>지사 선택</label>
                    <div className="relative">
                        <select
                            value={form.branch}
                            onChange={e => setForm({ ...form, branch: e.target.value })}
                            className={`w-full px-5 py-4 rounded-[1.5rem] border-2 transition-all outline-none appearance-none font-bold cursor-pointer ${theme === 'premium-dark'
                                ? 'bg-slate-800/50 border-slate-700 text-white focus:border-blue-500 hover:bg-slate-800'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500 hover:border-slate-200 shadow-sm'
                                }`}
                        >
                            <option value="">지사를 선택하세요</option>
                            {branches.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                        <div className={`absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'premium-dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className={`text-sm font-bold ml-1 ${theme === 'premium-dark' ? 'text-slate-400' : 'text-slate-600'}`}>담당자</label>
                        <input
                            type="text"
                            placeholder="성함 입력"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className={`w-full px-5 py-4 rounded-[1.5rem] border-2 transition-all outline-none font-bold ${theme === 'premium-dark'
                                ? 'bg-slate-800/50 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-600'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500 placeholder:text-slate-300 shadow-sm'
                                }`}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className={`text-sm font-bold ml-1 ${theme === 'premium-dark' ? 'text-slate-400' : 'text-slate-600'}`}>상호명</label>
                        <input
                            type="text"
                            placeholder="상호명 입력"
                            value={form.business_name}
                            onChange={e => setForm({ ...form, business_name: e.target.value })}
                            className={`w-full px-5 py-4 rounded-[1.5rem] border-2 transition-all outline-none font-bold ${theme === 'premium-dark'
                                ? 'bg-slate-800/50 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-600'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500 placeholder:text-slate-300 shadow-sm'
                                }`}
                        />
                    </div>
                </div>

                <div className={`p-6 rounded-[2.5rem] space-y-6 border-2 transition-all ${theme === 'premium-dark'
                    ? 'bg-slate-800/30 border-slate-700/50'
                    : 'bg-slate-50 border-slate-100'
                    }`}>
                    <div className="flex justify-between items-center px-1">
                        <h3 className={`font-black text-lg ${theme === 'premium-dark' ? 'text-slate-300' : 'text-slate-700'}`}>점검 항목</h3>
                        {form.activeCategory && (
                            <button
                                type="button"
                                onClick={setAllActionComplete}
                                className={`text-[10px] uppercase tracking-tighter px-4 py-2 rounded-full font-black shadow-lg transition-all active:scale-95 ${theme === 'premium-dark'
                                    ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/40'
                                    : 'bg-slate-800 text-white hover:bg-slate-700 shadow-slate-200'
                                    }`}
                            >
                                전체 조치완료
                            </button>
                        )}
                    </div>

                    <div className={`flex p-1.5 rounded-[1.5rem] gap-1.5 ${theme === 'premium-dark' ? 'bg-slate-900/50' : 'bg-slate-200/50'}`}>
                        {[
                            { id: 'customer', label: '고객', emoji: '🤝', isComplete: !!(form.subItems.customer_1 || form.subItems.customer_2) },
                            { id: 'system', label: '시스템', emoji: '⚙️', isComplete: !!(form.subItems.system_1 || form.subItems.system_2 || form.subItems.system_3) },
                            { id: 'appearance', label: '외관', emoji: '🏢', isComplete: !!(form.subItems.appearance_1 || form.subItems.appearance_2) },
                        ].map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setForm({ ...form, activeCategory: cat.id as any })}
                                className={`flex-1 py-4 px-1 rounded-[1.2rem] text-xs font-black transition-all flex flex-col items-center justify-center gap-2 ${form.activeCategory === cat.id
                                    ? theme === 'premium-dark'
                                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 scale-105'
                                        : 'bg-white text-blue-600 shadow-lg scale-105'
                                    : theme === 'premium-dark'
                                        ? 'text-slate-500 hover:bg-slate-800/50'
                                        : 'text-slate-500 hover:bg-white/50'
                                    }`}
                            >
                                <span className="text-lg mb-0.5">{cat.emoji}</span>
                                <span className="flex items-center gap-1.5">
                                    {cat.label}
                                    {cat.isComplete && (
                                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="animate-fadeIn min-h-[160px]">
                        {form.activeCategory === 'customer' && (
                            <div className="space-y-5">
                                {[
                                    { id: 'customer_1', label: '안부인사 및 불편사항 점검' },
                                    { id: 'customer_2', label: '보안 이슈 사전 청취' }
                                ].map((item) => (
                                    <div key={item.id} className="space-y-2">
                                        <label className={`text-xs font-bold px-1 tracking-tight ${theme === 'premium-dark' ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</label>
                                        <div className="relative">
                                            <select
                                                value={(form.subItems as any)[item.id]}
                                                onChange={e => setForm({ ...form, subItems: { ...form.subItems, [item.id]: e.target.value } })}
                                                className={`w-full px-5 py-3 rounded-2xl border-2 transition-all outline-none appearance-none font-black text-sm cursor-pointer ${theme === 'premium-dark'
                                                    ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                                                    : 'bg-white border-white text-slate-800 focus:border-blue-500 shadow-sm'
                                                    }`}
                                            >
                                                <option value="">상태 선택</option>
                                                <option value="양호">양호</option>
                                                <option value="조치완료">조치완료</option>
                                                <option value="해당없음">해당없음</option>
                                            </select>
                                            <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${theme === 'premium-dark' ? 'text-slate-600' : 'text-slate-300'}`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {form.activeCategory === 'appearance' && (
                            <div className="space-y-5">
                                {[
                                    { id: 'appearance_1', label: '표지판(스티커) 교체' },
                                    { id: 'appearance_2', label: '장비 이물질 제거(환경개선)' }
                                ].map((item) => (
                                    <div key={item.id} className="space-y-2">
                                        <label className={`text-xs font-bold px-1 tracking-tight ${theme === 'premium-dark' ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</label>
                                        <div className="relative">
                                            <select
                                                value={(form.subItems as any)[item.id]}
                                                onChange={e => setForm({ ...form, subItems: { ...form.subItems, [item.id]: e.target.value } })}
                                                className={`w-full px-5 py-3 rounded-2xl border-2 transition-all outline-none appearance-none font-black text-sm cursor-pointer ${theme === 'premium-dark'
                                                    ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                                                    : 'bg-white border-white text-slate-800 focus:border-blue-500 shadow-sm'
                                                    }`}
                                            >
                                                <option value="">상태 선택</option>
                                                <option value="양호">양호</option>
                                                <option value="조치완료">조치완료</option>
                                                <option value="해당없음">해당없음</option>
                                            </select>
                                            <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${theme === 'premium-dark' ? 'text-slate-600' : 'text-slate-300'}`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {form.activeCategory === 'system' && (
                            <div className="space-y-5">
                                {[
                                    { id: 'system_1', label: '카메라 정상 작동 확인' },
                                    { id: 'system_2', label: '영상저장장치 리더기 점검' },
                                    { id: 'system_3', label: '락 정상 작동여부 확인' }
                                ].map((item) => (
                                    <div key={item.id} className="space-y-2">
                                        <label className={`text-xs font-bold px-1 tracking-tight ${theme === 'premium-dark' ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</label>
                                        <div className="relative">
                                            <select
                                                value={(form.subItems as any)[item.id]}
                                                onChange={e => setForm({ ...form, subItems: { ...form.subItems, [item.id]: e.target.value } })}
                                                className={`w-full px-5 py-3 rounded-2xl border-2 transition-all outline-none appearance-none font-black text-sm cursor-pointer ${theme === 'premium-dark'
                                                    ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                                                    : 'bg-white border-white text-slate-800 focus:border-blue-500 shadow-sm'
                                                    }`}
                                            >
                                                <option value="">상태 선택</option>
                                                <option value="양호">양호</option>
                                                <option value="조치완료">조치완료</option>
                                                <option value="해당없음">해당없음</option>
                                            </select>
                                            <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${theme === 'premium-dark' ? 'text-slate-600' : 'text-slate-300'}`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!form.activeCategory && (
                            <div className={`flex flex-col items-center justify-center h-48 rounded-[2rem] border-2 border-dashed transition-colors ${theme === 'premium-dark'
                                ? 'border-slate-700 text-slate-600 bg-slate-900/20'
                                : 'border-slate-200 text-slate-400 bg-white/40'
                                }`}>
                                <div className="w-12 h-12 mb-3 bg-slate-400/10 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <p className="text-xs font-bold tracking-tight">상단 탭을 선택하여 점검을 시작하세요.</p>
                            </div>
                        )}
                    </div>
                </div>

                {form.activeCategory === 'appearance' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="flex justify-between items-center ml-1">
                            <label className={`text-sm font-black ${theme === 'premium-dark' ? 'text-slate-400' : 'text-slate-600'}`}>현장 사진 <span className="text-xs font-normal opacity-50 ml-1">(최대 3장)</span></label>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {imageUrls.map((url, idx) => (
                                <div key={idx} className={`relative aspect-square rounded-[1.8rem] overflow-hidden group border-2 shadow-inner transition-all hover:scale-105 active:scale-95 ${theme === 'premium-dark' ? 'border-slate-700' : 'border-slate-100'}`}>
                                    <img src={url} alt="preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute inset-0 bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center font-black text-[10px]"
                                    >
                                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        삭제
                                    </button>
                                </div>
                            ))}
                            {imageUrls.length < 3 && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`aspect-square rounded-[1.8rem] border-2 border-dashed flex flex-col items-center justify-center transition-all group active:scale-95 ${theme === 'premium-dark'
                                        ? 'border-slate-700 bg-slate-800/20 text-slate-600 hover:border-blue-500 hover:text-blue-500 hover:bg-slate-800'
                                        : 'border-slate-100 bg-white/50 text-slate-300 hover:border-blue-500 hover:text-blue-500 hover:bg-white shadow-sm'
                                        }`}
                                >
                                    <svg className="w-8 h-8 mb-1 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" /></svg>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Photo</span>
                                </button>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageUpload}
                        />
                    </div>
                )}

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`group w-full h-20 rounded-[2.5rem] text-xl font-black tracking-tight shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${theme === 'premium-dark'
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40 disabled:bg-slate-800'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-gray-300 disabled:bg-slate-300'
                            }`}
                    >
                        {loading ? (
                            <div className="w-7 h-7 border-[5px] border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                점검 결과 제출하기
                                <svg className="w-6 h-6 transition-transform group-hover:translate-x-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
