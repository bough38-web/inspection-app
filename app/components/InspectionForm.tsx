'use client';
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from './ui/Button';
import { compressImageClient } from '@/lib/clientCompress';
import Script from 'next/script';

// --- Types ---
type TransactionType = '입고' | '출고' | '실사' | '폐기';
type ConditionStatus = '신품' | '양호' | '요수리' | '파손';

function InventoryFormContent() {
    const [photos, setPhotos] = useState<File[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    
    // Form State
    const [form, setForm] = useState({
        branch: '',         // 지점/창고
        name: '',           // 담당자
        business_name: '',  // 현장명 (기존 컬럼 재활용)
        transaction_type: '입고' as TransactionType,
        item_name: '',
        item_code: '',
        quantity: 1,
        condition_status: '신품' as ConditionStatus,
        remarks: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const scannerRef = useRef<any>(null);
    const searchParams = useSearchParams();

    const branches = ['중앙창고', '강북센터', '서대문고', '고양메인', '의정부센터', '남양주창고', '강릉지사', '원주센터'];

    useEffect(() => {
        const business_name = searchParams.get('business_name');
        const branch = searchParams.get('branch');
        const name = searchParams.get('name');
        
        if (business_name || branch || name) {
            setForm(prev => ({
                ...prev,
                business_name: business_name || prev.business_name,
                branch: branch || prev.branch,
                name: name || prev.name,
            }));
        }
    }, [searchParams]);

    // --- Barcode Scanner Logic ---
    const startScanner = () => {
        setIsScannerOpen(true);
        setTimeout(() => {
            const Html5QrcodeScanner = (window as any).Html5QrcodeScanner;
            if (Html5QrcodeScanner) {
                scannerRef.current = new Html5QrcodeScanner(
                    "reader", 
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    /* verbose= */ false
                );
                scannerRef.current.render((decodedText: string) => {
                    setForm(prev => ({ ...prev, item_code: decodedText }));
                    stopScanner();
                }, (error: any) => {
                    // console.warn(error);
                });
            }
        }, 300);
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch((error: any) => console.error("Scanner clear fail", error));
        }
        setIsScannerOpen(false);
    };

    // --- Image Handling ---
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (photos.length >= 3) {
                alert('최대 3장까지만 업로드 가능합니다.');
                return;
            }
            const compressedFile = await compressImageClient(file);
            const newUrl = URL.createObjectURL(file);
            setPhotos(prev => [...prev, compressedFile]);
            setImageUrls(prev => [...prev, newUrl]);
        }
    };

    const removeImage = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    // --- Submission ---
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.branch || !form.item_name || !form.item_code) {
            alert('필수 항목(지점, 물품명, 품번)을 입력해주세요.');
            return;
        }

        setLoading(true);
        setErrorMessage(null);

        const fd = new FormData();
        photos.forEach(p => fd.append('photos', p));
        fd.append('branch', form.branch);
        fd.append('name', form.name);
        fd.append('business_name', form.business_name);
        fd.append('transaction_type', form.transaction_type);
        fd.append('item_name', form.item_name);
        fd.append('item_code', form.item_code);
        fd.append('quantity', form.quantity.toString());
        fd.append('condition_status', form.condition_status);
        fd.append('remarks', form.remarks);
        fd.append('activity_type', `[${form.transaction_type}] ${form.item_name} (${form.item_code}) x${form.quantity}`); // Backup for old view

        try {
            const res = await fetch('/api/submit', { method: 'POST', body: fd });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || '제출 오류');
            }
            setSubmitted(true);
            setPhotos([]);
            setImageUrls([]);
        } catch (err: any) {
            setErrorMessage(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (submitted) {
        return (
            <div className="w-full max-w-md mx-auto bg-white p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 text-center space-y-8 animate-fadeIn">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-inner">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">등록 완료!</h2>
                    <p className="text-slate-500 mt-3 font-medium">재고 변동 내역이 성공적으로<br/>시스템에 반영되었습니다.</p>
                </div>
                <button 
                    onClick={() => {
                        setSubmitted(false);
                        setForm(prev => ({...prev, item_name: '', item_code: '', quantity: 1, remarks: ''}));
                    }} 
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                    추가 등록하기
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-4 sm:py-10 px-4 flex flex-col items-center">
            <Script src="https://unpkg.com/html5-qrcode" strategy="lazyOnload" />

            <form onSubmit={handleSubmit} className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
                {/* Header Section */}
                <div className="bg-slate-900 px-8 py-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2 opacity-80">
                            <div className="w-6 h-1 bg-blue-500 rounded-full"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Smart Logistics ver 2.0</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight leading-none">스마트 재고 관리</h1>
                        <p className="text-slate-400 mt-2 text-sm font-medium">현장 물품 입출고 및 실사 기록 시스템</p>
                    </div>
                </div>

                <div className="p-6 sm:p-10 space-y-8">
                    {errorMessage && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold animate-shake flex items-center gap-3">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            {errorMessage}
                        </div>
                    )}

                    {/* Transaction Tabs */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">유형 선택</label>
                        <div className="grid grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                            {(['입고', '출고', '실사', '폐기'] as TransactionType[]).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, transaction_type: type }))}
                                    className={`py-3.5 rounded-xl text-xs font-black transition-all ${
                                        form.transaction_type === type 
                                        ? 'bg-white text-slate-900 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    {type === '입고' && '📥 '}
                                    {type === '출고' && '📤 '}
                                    {type === '실사' && '🔍 '}
                                    {type === '폐기' && '♻️ '}
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Base Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 ml-1">지점 / 창고</label>
                            <select
                                value={form.branch}
                                onChange={e => setForm({ ...form, branch: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-sm"
                            >
                                <option value="">창고 선택</option>
                                {branches.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 ml-1">담당자</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="성함 입력"
                                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-sm"
                            />
                        </div>
                    </div>

                    {/* Item Info Card */}
                    <div className="bg-slate-50 rounded-[2rem] p-6 sm:p-8 border border-slate-200/50 space-y-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 ml-1">물품명</label>
                            <input
                                type="text"
                                value={form.item_name}
                                onChange={e => setForm({ ...form, item_name: e.target.value })}
                                placeholder="예: 무선 게이트웨이, 스티커 A형"
                                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white focus:border-blue-500 outline-none transition-all font-bold text-sm shadow-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 ml-1">품번 / 바코드</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={form.item_code}
                                    onChange={e => setForm({ ...form, item_code: e.target.value })}
                                    placeholder="바코드 수동 입력 또는 스캔"
                                    className="flex-1 px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white focus:border-blue-500 outline-none transition-all font-bold text-sm shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={startScanner}
                                    className="px-5 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v-4m6 0h2a2 2 0 012 2v2m-6 4h2a2 2 0 012 2v2m-6-10V4a2 2 0 00-2-2H4a2 2 0 00-2 2v2m4 6h-2a2 2 0 00-2 2v2m4-10V4" /></svg>
                                    스캔
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 ml-1">수량</label>
                                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border-2 border-slate-100 shadow-sm">
                                    <button 
                                        type="button" 
                                        onClick={() => setForm(prev => ({...prev, quantity: Math.max(1, prev.quantity - 1)}))}
                                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 active:scale-90 transition-all font-black text-xl"
                                    >-</button>
                                    <input 
                                        type="number" 
                                        value={form.quantity}
                                        onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 1})}
                                        className="flex-1 text-center font-black text-lg outline-none bg-transparent"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setForm(prev => ({...prev, quantity: prev.quantity + 1}))}
                                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 active:scale-90 transition-all font-black text-xl"
                                    >+</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 ml-1">물품 상태</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['신품', '양호', '요수리', '파손'] as ConditionStatus[]).map(status => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, condition_status: status }))}
                                            className={`py-3 rounded-xl text-[11px] font-black border-2 transition-all ${
                                                form.condition_status === status 
                                                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                                : 'border-white bg-white text-slate-400 hover:border-slate-200 hover:text-slate-600'
                                            }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Photos Section */}
                    <div className="space-y-4">
                        <label className="block text-xs font-black text-slate-500 ml-1 flex justify-between">
                            실물 근거 사진 <span className="font-normal opacity-50 underline">최대 3장</span>
                        </label>
                        <div className="grid grid-cols-3 gap-4">
                            {imageUrls.map((url, idx) => (
                                <div key={idx} className="relative aspect-square rounded-3xl overflow-hidden group border-2 border-slate-100 shadow-sm">
                                    <img src={url} alt="preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute inset-0 bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center font-black text-xs"
                                    >
                                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        삭제
                                    </button>
                                </div>
                            ))}
                            {imageUrls.length < 3 && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 transition-all hover:bg-white hover:border-blue-400 text-slate-400 flex flex-col items-center justify-center gap-2 group active:scale-95"
                                >
                                    <svg className="w-8 h-8 opacity-40 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" /></svg>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Add Image</span>
                                </button>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-500 ml-1">특이사항 (메모)</label>
                        <textarea
                            value={form.remarks}
                            onChange={e => setForm({ ...form, remarks: e.target.value })}
                            placeholder="전달할 특이사항이 있다면 입력하세요."
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-sm min-h-[100px]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 sm:py-7 bg-slate-900 hover:bg-slate-800 text-white font-black text-xl rounded-2xl sm:rounded-3xl shadow-[0_20px_40px_-10px_rgba(15,23,42,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-[4px] border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                기록 완료 및 제출
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </>
                        )}
                    </button>
                </div>
            </form>

            <div className="mt-8 text-slate-400 text-xs font-bold tracking-widest uppercase">
                &copy; 2026 Inventory Management Cloud
            </div>

            {/* Barcode Scanner Modal */}
            {isScannerOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 py-10 animate-fadeIn">
                    <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden relative">
                        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black">바코드 스캐너</h3>
                                <p className="text-slate-400 text-[10px] mt-1">영역 안에 바코드를 맞춰주세요.</p>
                            </div>
                            <button onClick={stopScanner} className="p-2 hover:bg-white/10 rounded-full transition-all">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div id="reader" className="w-full aspect-square sm:aspect-video bg-black"></div>
                        <div className="p-6 text-center">
                            <p className="text-slate-400 text-xs font-medium italic">스캐너 로딩 중...</p>
                        </div>
                    </div>
                </div>
            )}
            
            <style jsx global>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
                .animate-shake { animation: shake 0.3s ease-in-out infinite; }
                #reader__scan_region video { object-fit: cover !important; }
                #reader__dashboard { display: none !important; }
            `}</style>
        </div>
    );
}

export function InspectionForm() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black">SYSTEM LOADING...</div>}>
            <InventoryFormContent />
        </Suspense>
    );
}
