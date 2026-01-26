'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const adminId = process.env.NEXT_PUBLIC_ADMIN_ID || 'admin';
        const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin1234!!';

        if (id === adminId && password === adminPassword) {
            // Set simple auth flag
            // In a real app, use HttpOnly cookies via Server Action
            document.cookie = "is_admin=true; path=/; max-age=86400"; // 1 day
            localStorage.setItem('is_admin', 'true');
            router.push('/admin');
        } else {
            setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
            {/* Glassmorphism Card */}
            <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">관리자 로그인</h1>
                    <p className="text-gray-300 text-sm">시스템 관리를 위해 로그인이 필요합니다.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">아이디</label>
                        <input
                            type="text"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="admin"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">비밀번호</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center animate-shake">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-95"
                    >
                        로그인
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-gray-500">
                    &copy; 2024 Inspection System. Secure Access.
                </div>
            </div>
        </div>
    );
}
