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
    activity_type: string; // Added activity_type
}

export function AdminDashboard() {
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [loading, setLoading] = useState(true); // Changed from mounted to loading

    const downloadCSV = () => {
        const headers = ['ID', '날짜', '지사', '담당자', '계약번호', '상호명', '활동내역', '사진수'];
        const csvRows = [
            headers.join(','),
            ...inspections.map(i => [
                i.id,
                new Date(i.created_at).toLocaleDateString(),
                i.branch,
                i.name,
                `'${i.contract_no}`, // Prevent Excel scientific notation
                i.business_name,
                i.activity_type || '-',
                i.photo_count
            ].map(v => `"${v}"`).join(','))
        ];

        const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Korean support
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `현장점검_내역_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        // setMounted(true); // Removed as per instruction's state change
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

    if (loading) return <div className="max-w-6xl mx-auto p-6 text-center text-gray-500">로딩 중...</div>;


    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-col">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-gray-800">관리자 대시보드</h1>
                        <button
                            onClick={downloadCSV}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            엑셀 다운로드
                        </button>
                    </div>
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
