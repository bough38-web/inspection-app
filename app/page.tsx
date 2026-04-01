import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 text-center space-y-8 border border-gray-100 animate-in fade-in zoom-in duration-500">
        <div className="mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">서비스 종료 안내</h1>
          <div className="space-y-2">
            <p className="text-lg text-gray-600 leading-relaxed">
              현장점검 사진촬영 앱 서비스가<br />
              <span className="font-bold text-red-600 underline decoration-red-100 underline-offset-4">2026년 3월 31일</span>부로 종료되었습니다.
            </p>
          </div>
        </div>

        <div className="py-6 border-y border-gray-50 bg-gray-50/50 rounded-xl px-4">
          <p className="text-sm text-gray-500 leading-6">
            그동안 현장점검 서비스를 이용해주셔서 진심으로 감사합니다.<br />
            수집된 모든 데이터는 안전하게 백업 및 이관 처리되었습니다.
          </p>
        </div>
        
        <div className="pt-2 text-gray-400 text-xs">
          © 2026 Field Inspection Service. All rights reserved.
        </div>
      </div>
    </main>
  );
}
