'use client';
import { useEffect, useState } from 'react';
import { Button } from './ui/Button';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Inspection {
    id: string;
    created_at: string;
    branch: string;
    name: string;
    contract_no: string;
    business_name: string;
    photo_count: number;
    activity_type: string;
    folder_path: string;
}

// Stats Card Component for Dashboard
const StatCard = ({ title, count, color }: { title: string, count: number, color: string }) => (
    <div className={`p-6 rounded-2xl shadow-sm border border-gray-100 bg-white hover:shadow-md transition-shadow duration-300 transform hover:-translate-y-1`}>
        <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
        <p className={`text-4xl font-bold ${color}`}>{count}</p>
    </div>
);

// Toast Component
const Toast = ({ message, type }: { message: string, type: 'success' | 'error' | '' }) => {
    if (!message) return null;
    const bgClass = type === 'success' ? 'bg-green-600' : 'bg-red-500';
    return (
        <div className={`fixed bottom-6 right-6 ${bgClass} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in-up z-50`}>
            {type === 'success' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            )}
            <span className="font-medium">{message}</span>
        </div>
    );
};

// Helper to convert WebP Blob to PNG (ExcelJS requires PNG/JPEG)
const convertWebPToPNG = async (blob: Blob): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((pngBlob) => {
                    if (pngBlob) {
                        pngBlob.arrayBuffer().then(resolve).catch(reject);
                    } else {
                        reject(new Error('Canvas to Blob failed'));
                    }
                }, 'image/png');
            } else {
                reject(new Error('Canvas context failed'));
            }
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
    });
};

export function AdminDashboard() {
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingExcel, setGeneratingExcel] = useState(false);
    const [progress, setProgress] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | '' }>({ message: '', type: '' });
    const [isDeleting, setIsDeleting] = useState(false);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: '' }), 3000);
    };

    const fetchInspections = () => {
        setLoading(true);
        fetch('/api/inspections')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setInspections(data);
                } else {
                    setInspections([]);
                }
            })
            .catch(err => console.error('Failed to load data', err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchInspections();
    }, []);

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedIds.size === inspections.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(inspections.map(i => i.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    // Delete Logic
    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`정말 ${selectedIds.size}개의 항목을 삭제하시겠습니까? (복구 불가)`)) return;

        setIsDeleting(true);
        try {
            const res = await fetch('/api/inspections/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedIds) })
            });
            const result = await res.json();

            if (result.ok) {
                showToast(`${result.deleted}개의 항목이 삭제되었습니다.`, 'success');
                setSelectedIds(new Set());
                fetchInspections(); // Refresh list
            } else {
                showToast('삭제 실패: ' + result.error, 'error');
            }
        } catch (e) {
            showToast('네트워크 오류가 발생했습니다.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const downloadExcel = async () => {
        if (generatingExcel) return;
        setGeneratingExcel(true);
        setProgress(0);

        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('현장점검내역');

            // Define Columns
            sheet.columns = [
                { header: 'ID', key: 'id', width: 15 },
                { header: '날짜', key: 'date', width: 15 },
                { header: '지사', key: 'branch', width: 10 },
                { header: '담당자', key: 'name', width: 10 },
                { header: '계약번호', key: 'contract_no', width: 15 },
                { header: '상호명', key: 'business_name', width: 20 },
                { header: '활동내역_고객소통', key: 'activity_customer', width: 15 },
                { header: '활동내역_시스템점검', key: 'activity_system', width: 15 },
                { header: '활동내역_외관점검', key: 'activity_exterior', width: 15 },
                { header: '사진1', key: 'photo1', width: 20 },
                { header: '사진2', key: 'photo2', width: 20 },
                { header: '사진3', key: 'photo3', width: 20 },
            ];
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            const total = inspections.length;
            for (let i = 0; i < total; i++) {
                const item = inspections[i];
                const rowIndex = i + 2;
                const row = sheet.getRow(rowIndex);
                row.values = {
                    id: item.id,
                    date: new Date(item.created_at).toLocaleDateString(),
                    branch: item.branch,
                    name: item.name,
                    contract_no: item.contract_no,
                    business_name: item.business_name,
                    activity_customer: (item.activity_type || '').includes('고객소통') ? 'O' : '',
                    activity_system: (item.activity_type || '').includes('시스템점검') ? 'O' : '',
                    activity_exterior: (item.activity_type || '').includes('외관점검') ? 'O' : '',
                };
                row.height = 100;
                row.alignment = { vertical: 'middle' };

                if (item.folder_path) {
                    for (let p = 1; p <= 3; p++) {
                        const imgPath = `${item.folder_path}/${p}.webp`;
                        try {
                            const res = await fetch(`/api/proxy-image?path=${encodeURIComponent(imgPath)}`);
                            if (res.ok) {
                                const webpBlob = await res.blob();
                                const pngBuffer = await convertWebPToPNG(webpBlob);
                                const imageId = workbook.addImage({ buffer: pngBuffer, extension: 'png' });
                                // Adjust column index for photos (now starting at index 9: 0-8 used by data)
                                // Columns: id(0), date(1), branch(2), name(3), contract(4), business(5), customer(6), system(7), exterior(8)
                                // Photos start at column 9 (header: photo1)
                                const colIndex = 9 + (p - 1);
                                sheet.addImage(imageId, {
                                    tl: { col: colIndex, row: rowIndex - 1 },
                                    br: { col: colIndex + 1, row: rowIndex },
                                    editAs: 'oneCell'
                                } as any);
                            }
                        } catch (e) { }
                    }
                }
                setProgress(Math.round(((i + 1) / total) * 100));
            }
            const buf = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buf]), `현장점검_내역_${new Date().toISOString().slice(0, 10)}.xlsx`);
            showToast('엑셀 다운로드가 완료되었습니다.', 'success');
        } catch (error) {
            console.error(error);
            showToast('엑셀 생성 중 오류가 발생했습니다.', 'error');
        } finally {
            setGeneratingExcel(false);
            setProgress(0);
        }
    };

    const downloadZip = async (id: string, name: string) => {
        try { window.location.href = `/api/download-zip?id=${id}`; }
        catch (e) { showToast('다운로드 요청 실패', 'error'); }
    };

    // Calculate Stats
    const branchStats = inspections.reduce((acc, curr) => {
        acc[curr.branch] = (acc[curr.branch] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const sortedBranches = Object.entries(branchStats).sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...Object.values(branchStats), 1);

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
            {/* Toast Notification */}
            <Toast message={toast.message} type={toast.type as any} />

            {/* Header Area with Glassmorphism */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        관리자 대시보드
                    </h1>
                    <p className="text-sm text-gray-500 mt-2 font-medium">실시간 현장 점검 데이터 및 파일 관리</p>
                </div>

                <div className="mt-4 md:mt-0 flex items-center gap-3">
                    <Button
                        onClick={downloadExcel}
                        disabled={generatingExcel}
                        className={`px-5 py-2.5 rounded-xl font-semibold shadow-lg transition-all transform hover:scale-105 ${generatingExcel
                            ? 'bg-gray-800 cursor-not-allowed text-gray-400'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-emerald-500/30'
                            }`}
                    >
                        {generatingExcel ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                생성 중 ({progress}%)
                            </span>
                        ) : '엑셀 다운로드 (전체)'}
                    </Button>
                </div>
            </header>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="총 등록 건수" count={inspections.length} color="text-blue-600" />
                <StatCard title="오늘 등록" count={inspections.filter(i => new Date(i.created_at).toDateString() === new Date().toDateString()).length} color="text-indigo-600" />
                <StatCard title="사진 파일" count={inspections.reduce((acc, curr) => acc + curr.photo_count, 0)} color="text-purple-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Branch Chart */}
                <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><span className="w-2 h-6 bg-blue-500 rounded-full"></span>지사별 현황</h2>
                    <div className="space-y-5">
                        {sortedBranches.length === 0 && <div className="text-gray-400 text-center py-10 bg-gray-50 rounded-2xl">데이터가 없습니다</div>}
                        {sortedBranches.map(([branch, count]) => (
                            <div key={branch} className="space-y-2 group cursor-pointer">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-gray-600 group-hover:text-blue-600 transition-colors">{branch}</span>
                                    <span className="text-gray-900">{count}건</span>
                                </div>
                                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out group-hover:bg-blue-600"
                                        style={{ width: `${(count / maxCount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Table */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[500px]">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>최근 등록 목록
                        </h2>
                        {/* Floating Action for Selection */}
                        {selectedIds.size > 0 && (
                            <div className="animate-fade-in flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-lg border border-red-100">
                                <span className="text-sm font-bold text-red-600">{selectedIds.size}개 선택됨</span>
                                <button
                                    onClick={handleDeleteSelected}
                                    disabled={isDeleting}
                                    className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shadow-md"
                                >
                                    {isDeleting ? '삭제 중...' : '선택 삭제'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 sticky top-0 backdrop-blur-sm z-10">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            checked={inspections.length > 0 && selectedIds.size === inspections.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 transition-colors cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-4 font-semibold">등록일시</th>
                                    <th className="px-6 py-4 font-semibold">지사</th>
                                    <th className="px-6 py-4 font-semibold">담당자/상호</th>
                                    <th className="px-6 py-4 font-semibold">활동내역</th>
                                    <th className="px-6 py-4 text-right font-semibold">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    /* Skeleton Loading */
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 w-4 bg-gray-200 rounded"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 rounded"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 rounded"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 w-40 bg-gray-200 rounded"></div></td>
                                            <td className="px-6 py-4"><div className="h-6 w-16 bg-gray-200 rounded ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : inspections.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-20 text-gray-400">데이터가 없습니다.</td></tr>
                                ) : (
                                    inspections.map((item) => (
                                        <tr
                                            key={item.id}
                                            className={`hover:bg-blue-50/30 transition-colors duration-200 group ${selectedIds.has(item.id) ? 'bg-blue-50/60' : ''}`}
                                        >
                                            <td className="px-6 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={() => toggleSelect(item.id)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 font-medium">
                                                {new Date(item.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <span className="px-2.5 py-1 bg-gray-100 rounded-md text-xs font-semibold text-gray-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                    {item.branch}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800">{item.business_name}</span>
                                                    <span className="text-xs text-gray-400">{item.name} | {item.contract_no}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded inline-block max-w-[150px] truncate">
                                                    {item.activity_type || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    variant="secondary"
                                                    className="text-xs px-3 py-1.5 h-auto bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 shadow-sm"
                                                    onClick={() => downloadZip(item.id, item.business_name)}
                                                >
                                                    ZIP 다운
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
