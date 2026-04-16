'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('중앙지사');
    const [branchPassword, setBranchPassword] = useState('');
    const [loginMode, setLoginMode] = useState<'manager' | 'branch'>('manager');
    const router = useRouter();

    const branches = ['중앙지사', '강북지사', '서대문지사', '고양지사', '의정부지사', '남양주지사', '강릉지사', '원주지사'];

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (loginMode === 'manager') {
            const adminId = process.env.NEXT_PUBLIC_ADMIN_ID || 'admin';
            const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin1234!!';

            if (id === adminId && password === adminPassword) {
                document.cookie = "is_admin=true; path=/; max-age=86400";
                localStorage.setItem('user_role', 'manager');
                router.push('/admin');
            } else {
                setError('아이디 또는 비밀번호가 올바르지 않습니다.');
            }
        } else {
            // Branch login
            const validBranchPassword = process.env.NEXT_PUBLIC_BRANCH_PASSWORD || '1234';
            if (branchPassword === validBranchPassword) {
                document.cookie = `branch_name=${encodeURIComponent(selectedBranch)}; path=/; max-age=86400`;
                localStorage.setItem('user_role', 'branch');
                localStorage.setItem('branch_name', selectedBranch);
                router.push('/admin');
            } else {
                setError('지사 비밀번호가 일치하지 않습니다.');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="text-center mb-8 relative z-10">
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Plus One 시스템</h1>
                    <p className="text-gray-300 text-sm font-medium">관리자 및 지사 전용 접근</p>
                </div>

                <div className="flex bg-gray-800/50 p-1.5 rounded-xl mb-6 relative z-10">
                    <button
                        type="button"
                        onClick={() => { setLoginMode('manager'); setError(''); }}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginMode === 'manager' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        마스터 관리자
                    </button>
                    <button
                        type="button"
                        onClick={() => { setLoginMode('branch'); setError(''); }}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginMode === 'branch' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        지사
                    </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                    {loginMode === 'manager' ? (
                        <div className="space-y-6 animate-fadeIn" key="manager-form">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">아이디</label>
                                <input
                                    type="text"
                                    value={id}
                                    onChange={(e) => setId(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="admin"
                                    autoComplete="username"
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
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fadeIn" key="branch-form">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">지사 선택</label>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                                >
                                    {branches.map((branch) => (
                                        <option key={branch} value={branch} className="bg-gray-800 text-white">
                                            {branch}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">비밀번호</label>
                                <input
                                    type="password"
                                    value={branchPassword}
                                    onChange={(e) => setBranchPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center animate-shake">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transform transition-all hover:scale-[1.02] active:scale-95"
                    >
                        로그인
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-gray-500 relative z-10">
                    &copy; 2026 Field Inspection Service.
                </div>
            </div>
        </div>
    );
}
