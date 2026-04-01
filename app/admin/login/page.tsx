import React from 'react';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 text-center space-y-8 border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight tracking-tight">서비스 종료 안내</h1>
        <p className="text-gray-500 leading-relaxed">로그인 서버 운영이 중단되었습니다.<br />더 이상 로그인할 수 없습니다.</p>
        <div className="pt-4 border-t border-gray-50">
          <a href="/" className="text-indigo-600 font-medium hover:text-indigo-500 transition-colors">홈페이지로 돌아가기</a>
        </div>
      </div>
    </main>
  );
}
