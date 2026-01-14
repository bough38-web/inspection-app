'use client';
import { useEffect, useState } from 'react';
import { Button } from './ui/Button';

interface Inspection {
    id: string;
    created_at: string;
    branch: string;
    name: string;
    contract_no: string;
    business_name: string;
    photo_count: number;
}

export function AdminDashboard() {
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetch('/api/inspections')
            .then(res => res.json())
            .then(data => setInspections(data))
            .catch(err => console.error('Failed to load data', err));
    }, []);

    const downloadZip = async (id: string, name: string) => {
        try {
            // Trigger the download endpoint with the real ID
            window.location.href = `/api/download-zip?id=${id}`;
        } catch (e) {
            alert('다운로드 실패');
        }
    };

    // Calculate Stats
    const branchStats = inspections.reduce((acc, curr) => {
        acc[curr.branch] = (acc[curr.branch] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const sortedBranches = Object.entries(branchStats).sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...Object.values(branchStats), 1);

    if (!mounted) return null;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
                    <p className="text-sm text-gray-500 mt-1">지사별 등록 현황 및 파일 다운로드</p>
                </div>
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                    <span className="text-sm text-blue-600 font-semibold">총 등록 건수: {inspections.length}건</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Branch Visualization */}
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">지사별 등록 현황</h2>
                    <div className="space-y-4">
                        {sortedBranches.length === 0 && <p className="text-gray-400 text-center py-4">데이터가 없습니다</p>}
                        {sortedBranches.map(([branch, count]) => (
                            <div key={branch} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-gray-700">{branch}</span>
                                    <span className="text-gray-500">{count}건</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                        style={{ width: `${(count / maxCount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent List */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">최근 등록 목록</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">등록일시</th>
                                    <th className="px-4 py-3">지사</th>
                                    <th className="px-4 py-3">담당자</th>
                                    <th className="px-4 py-3">상호명</th>
                                    <th className="px-4 py-3">사진</th>
                                    <th className="px-4 py-3 rounded-r-lg">작업</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inspections.length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">등록된 데이터가 없습니다.</td></tr>
                                )}
                                {inspections.map((item) => (
                                    <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {new Date(item.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{item.branch}</span></td>
                                        <td className="px-4 py-3">{item.name}</td>
                                        <td className="px-4 py-3">{item.business_name}</td>
                                        <td className="px-4 py-3 text-gray-500">{item.photo_count}장</td>
                                        <td className="px-4 py-3">
                                            <Button
                                                variant="secondary"
                                                className="text-xs px-3 py-1 h-auto"
                                                onClick={() => downloadZip(item.id, item.business_name)}
                                            >
                                                다운로드
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
