'use client';

import React, { useState, useEffect } from 'react';

export function NoticeModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check if notice was dismissed today
        const dismissedDate = localStorage.getItem('notice_dismissed_date');
        const today = new Date().toDateString();
        
        if (dismissedDate !== today) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleDismissToday = () => {
        const today = new Date().toDateString();
        localStorage.setItem('notice_dismissed_date', today);
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-slate-100">
                <div className="bg-red-50 px-6 py-8 sm:px-10 sm:py-10 text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-2">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.268 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight break-keep">
                        시스템 종료 안내
                    </h2>
                    <div className="space-y-4 text-slate-600 leading-relaxed text-base sm:text-lg break-keep font-medium">
                        <p>
                            정보보안 이슈로 인하여 본 프로그램은 불가피하게 <br className="hidden sm:block" />
                            <span className="text-red-600 font-black">3월 31일까지 사용하고 종료</span>됨을 알려드립니다.
                        </p>
                        <p className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-700">
                            업로드된 데이터는 <span className="font-bold underline decoration-blue-500 underline-offset-4">4월 1일 오전까지</span> <br className="hidden sm:block" />
                            반드시 다운로드하여 주시기 바랍니다.
                        </p>
                        <p className="text-sm text-slate-500">
                            자세한 사항은 본부 담당자에게 문의 바랍니다.
                        </p>
                    </div>
                </div>

                <div className="p-6 sm:p-8 bg-white flex flex-col gap-3">
                    <button
                        onClick={handleClose}
                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-xl shadow-slate-200"
                    >
                        확인하였습니다
                    </button>
                    <button
                        onClick={handleDismissToday}
                        className="w-full py-3 bg-white hover:bg-slate-50 text-slate-400 rounded-xl font-bold text-sm transition-all border border-transparent hover:border-slate-100"
                    >
                        오늘 하루 다시 보지 않기
                    </button>
                </div>
            </div>
        </div>
    );
}
