'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [loginType, setLoginType] = useState<'manager' | 'branch'>('manager');
    const [id, setId] = useState('');
    const [managerPassword, setManagerPassword] = useState('');
    const [branchPassword, setBranchPassword] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('중앙지사');
    const [error, setError] = useState('');
    const router = useRouter();

    const branches = [
        '중앙지사',
        '강북지사',
        '서대문지사',
        '고양지사',
        '의정부지사',
        '남양주지사',
        '강릉지사',
        '원주지사'
    ];

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        if (loginType === 'manager') {
            const adminId = process.env.NEXT_PUBLIC_ADMIN_ID || 'admin';
            const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin1234!!';

            if (id === adminId && managerPassword === adminPassword) {
                document.cookie = "is_admin=true; path=/; max-age=86400"; // 1 day
                localStorage.setItem('is_admin', 'true');
                localStorage.setItem('user_role', 'manager');
                router.push('/admin');
            } else {
                setError('관리자 아이디 또는 비밀번호가 올바르지 않습니다.');
            }
        } else {
            // Branch Login Logic
            const branchPasswords: { [key: string]: string } = {
                '중앙지사': 'wnddkd',
                '강북지사': 'rkdqnr',
                '서대문지사': 'tjeoans',
                '고양지사': 'rhdid',
                '의정부지사': 'dmlwjdqn',
                '남양주지사': 'skadidwn',
                '강릉지사': 'rkdfmd',
                '원주지사': 'dnjswn'
            };

            const correctPassword = branchPasswords[selectedBranch];

            if (correctPassword && branchPassword === correctPassword) {
                document.cookie = `branch_name=${encodeURIComponent(selectedBranch)}; path=/; max-age=86400`;
                localStorage.setItem('is_admin', 'false');
                localStorage.setItem('user_role', 'branch');
                localStorage.setItem('branch_name', selectedBranch);
                router.push('/admin');
            } else {
                setError('지사 비밀번호가 올바르지 않습니다.');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
            {/* Glassmorphism Card */}
            <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {loginType === 'manager' ? '관리자 로그인' : '지사 로그인'}
                    </h1>
                    <p className="text-gray-300 text-sm">
                        {loginType === 'manager'
                            ? '시스템 전체 관리를 위한 로그인입니다.'
                            : '각 지사별 업무 처리를 위한 로그인입니다.'}
                    </p>
                </div>

                {/* Login Type Tabs */}
                <div className="flex p-1 mb-6 bg-gray-800/50 rounded-xl border border-gray-600/50">
                    <button
                        type="button"
                        onClick={() => { setLoginType('branch'); setError(''); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${loginType === 'branch'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        지사
                    </button>
                    <button
                        type="button"
                        onClick={() => { setLoginType('manager'); setError(''); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${loginType === 'manager'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        관리자
                    </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {loginType === 'manager' ? (
                        <div className="space-y-6 animate-fadeIn" key="manager-form">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">아이디</label>
                                <input
                                    type="text"
                                    name="admin_id"
                                    id="admin_id"
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
                                    name="admin_password"
                                    id="admin_password"
                                    value={managerPassword}
                                    onChange={(e) => setManagerPassword(e.target.value)}
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
                                    name="branch_select"
                                    id="branch_select"
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
                                    name="branch_password"
                                    id="branch_password"
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
