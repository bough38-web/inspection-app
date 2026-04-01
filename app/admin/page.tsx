import React from 'react';

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 text-center space-y-8 border border-gray-100">
        <div className="mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 text-3xl font-bold">!</div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">관리자 서비스 종료</h1>
        <p className="text-gray-500">배포가 중단되어 관리자 페이지를<br />더 이상 이용할 수 없습니다.</p>
        <a href="/" className="inline-block px-8 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">홈으로 이동</a>
      </div>
    </main>
  );
}
