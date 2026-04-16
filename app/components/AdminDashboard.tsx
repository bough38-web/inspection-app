'use client';
import { useEffect, useState, useRef } from 'react';
import { Button } from './ui/Button';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ProgressDashboard } from './ProgressDashboard';

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
    // New Inventory Fields
    transaction_type?: string;
    item_name?: string;
    item_code?: string;
    quantity?: number;
    condition_status?: string;
    remarks?: string;
}

// Stats Card Component for Dashboard
const StatCard = ({ title, count, color, label }: { title: string, count: number | string, color: string, label?: string }) => (
    <div className={`p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 bg-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}>
        <p className="text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">{title}</p>
        <div className="flex items-baseline gap-1">
            <p className={`text-4xl font-black ${color}`}>{count}</p>
            {label && <span className="text-slate-400 font-bold text-sm tracking-tight">{label}</span>}
        </div>
    </div>
);

// Toast Component
const Toast = ({ message, type }: { message: string, type: 'success' | 'error' | '' }) => {
    if (!message) return null;
    const bgClass = type === 'success' ? 'bg-slate-900' : 'bg-red-500';
    return (
        <div className={`fixed bottom-8 right-8 ${bgClass} text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-in-up z-50 border border-white/10 backdrop-blur-md`}>
            {type === 'success' && (
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
            )}
            <span className="font-black text-sm tracking-tight">{message}</span>
        </div>
    );
};

// Helper to convert WebP Blob to PNG
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
    const [storageStats, setStorageStats] = useState<{ usedBytes: number, maxBytes: number, percentage: number } | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: '' }), 3000);
    };

    const fetchInspections = () => {
        setLoading(true);
        fetch('/api/inspections')
            .then(res => res.json())
            .then(data => {
                setInspections(Array.isArray(data) ? data : []);
            })
            .catch(err => console.error('Failed to load data', err))
            .finally(() => setLoading(false));

        fetch('/api/storage-stats')
            .then(res => res.json())
            .then(data => {
                if (!data.error) setStorageStats(data);
            })
            .catch(err => console.error('Failed to load storage stats', err));
    };

    useEffect(() => {
        fetchInspections();
    }, []);

    const [filteredInspections, setFilteredInspections] = useState<Inspection[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userBranch, setUserBranch] = useState('');
    const isInitialized = useRef(false);

    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;
        const role = localStorage.getItem('user_role');
        const branch = localStorage.getItem('branch_name') || '';
        if (!role) { window.location.href = '/admin/login'; return; }
        setUserRole(role);
        setUserBranch(branch);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.href = '/admin/login';
    };

    useEffect(() => {
        if (!userRole) return;
        if (userRole === 'branch') {
            setFilteredInspections(inspections.filter(i => i.branch === userBranch));
        } else {
            setFilteredInspections(inspections);
        }
    }, [inspections, userRole, userBranch]);

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredInspections.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredInspections.map(i => i.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`정말 ${selectedIds.size}개의 재고 기록을 삭제하시겠습니까?`)) return;
        setIsDeleting(true);
        try {
            const res = await fetch('/api/inspections/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedIds) })
            });
            const result = await res.json();
            if (result.ok) {
                showToast(`${result.deleted}개의 기록이 삭제되었습니다.`, 'success');
                setSelectedIds(new Set());
                fetchInspections();
            }
        } finally { setIsDeleting(false); }
    };

    const downloadExcel = async (onlySelected = false) => {
        if (generatingExcel) return;
        setGeneratingExcel(true);
        setProgress(0);
        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('재고관리현황');
            sheet.columns = [
                { header: 'ID', key: 'id', width: 15 },
                { header: '일시', key: 'date', width: 22 },
                { header: '유형', key: 'type', width: 10 },
                { header: '지점/창고', key: 'branch', width: 15 },
                { header: '담당자', key: 'name', width: 12 },
                { header: '현장명', key: 'business', width: 20 },
                { header: '물품명', key: 'item_name', width: 25 },
                { header: '바코드/품번', key: 'item_code', width: 20 },
                { header: '수량', key: 'qty', width: 8 },
                { header: '상태', key: 'status', width: 10 },
                { header: '특이사항', key: 'remarks', width: 30 },
                { header: '증빙사진1', key: 'p1', width: 20 },
                { header: '증빙사진2', key: 'p2', width: 20 },
            ];
            sheet.getRow(1).font = { bold: true };
            const targetItems = onlySelected ? filteredInspections.filter(i => selectedIds.has(i.id)) : filteredInspections;
            
            for (let i = 0; i < targetItems.length; i++) {
                const item = targetItems[i];
                const row = sheet.getRow(i + 2);
                row.values = {
                    id: item.id,
                    date: new Date(item.created_at).toLocaleString('ko-KR'),
                    type: item.transaction_type || '-',
                    branch: item.branch,
                    name: item.name,
                    business: item.business_name,
                    item_name: item.item_name || '-',
                    item_code: item.item_code || '-',
                    qty: item.quantity || 1,
                    status: item.condition_status || '-',
                    remarks: item.remarks || '-'
                };
                row.height = 80;
                row.alignment = { vertical: 'middle' };

                if (item.folder_path) {
                    for (let p = 1; p <= 2; p++) {
                        const imgPath = `${item.folder_path}/${p}.webp`;
                        try {
                            const res = await fetch(`/api/proxy-image?path=${encodeURIComponent(imgPath)}`);
                            if (res.ok) {
                                const webpBlob = await res.blob();
                                const pngBuffer = await convertWebPToPNG(webpBlob);
                                const imageId = workbook.addImage({ buffer: pngBuffer, extension: 'png' });
                                sheet.addImage(imageId, {
                                    tl: { col: 10 + p, row: i + 1 },
                                    br: { col: 11 + p, row: i + 2 },
                                    editAs: 'oneCell'
                                } as any);
                            }
                        } catch (e) {}
                    }
                }
                setProgress(Math.round(((i + 1) / targetItems.length) * 100));
            }
            const buf = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buf]), `재고관리리포트_${new Date().toISOString().slice(0,10)}.xlsx`);
            showToast('엑셀 리포트 생성이 완료되었습니다.', 'success');
        } finally { setGeneratingExcel(false); setProgress(0); }
    };

    const downloadZip = (id: string) => {
        window.location.href = `/api/download-zip?id=${id}`;
    };

    const [viewMode, setViewMode] = useState<'list' | 'progress'>('list');

    if (!userRole) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400">LOADING HUB...</div>;
    if (viewMode === 'progress') return <ProgressDashboard inspections={filteredInspections} onBack={() => setViewMode('list')} />;

    return (
        <div className="w-full px-4 sm:px-10 py-10 space-y-10 bg-[#F8FAFC] min-h-screen animate-fadeIn">
            <Toast message={toast.message} type={toast.type as any} />

            {/* Header Section */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-full uppercase tracking-tighter">Admin Portal</span>
                        <span className="text-slate-300 font-bold text-xs tracking-widest uppercase">System Control</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">
                        재고 현황 대시보드
                        {userRole === 'branch' && <span className="text-blue-600 block sm:inline sm:ml-4 text-2xl">[{userBranch}]</span>}
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => downloadExcel(false)} className="px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        {generatingExcel ? `생성 중 (${progress}%)` : '전체 엑셀 리포트'}
                    </button>
                    <button onClick={handleLogout} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl">시스템 로그아웃</button>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="누적 관리 정보" count={filteredInspections.length} color="text-slate-900" label="건" />
                <StatCard title="금일 변동 내역" count={filteredInspections.filter(i => new Date(i.created_at).toDateString() === new Date().toDateString()).length} color="text-blue-600" label="건" />
                <StatCard title="입고 대기 물품" count={filteredInspections.filter(i => i.transaction_type === '입고').length} color="text-emerald-600" label="건" />
                <StatCard title="파손/폐기 보고" count={filteredInspections.filter(i => i.condition_status === '파손' || i.transaction_type === '폐기').length} color="text-rose-600" label="건" />
            </div>

            {/* Main Log Table */}
            <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
                <div className="p-10 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center bg-white gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">최근 재고 변동 이력</h2>
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-2xl animate-fadeIn">
                                <span className="text-xs font-black text-blue-700">{selectedIds.size}개 레코드 선택</span>
                                <button onClick={() => downloadExcel(true)} className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded-lg font-black uppercase">선택 다운로드</button>
                                <button onClick={handleDeleteSelected} className="text-[10px] bg-rose-500 text-white px-3 py-1 rounded-lg font-black uppercase">삭제</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] border-b border-slate-100">
                                <th className="px-8 py-6 w-12"><input type="checkbox" checked={selectedIds.size === filteredInspections.length && filteredInspections.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded-lg accent-slate-900" /></th>
                                <th className="px-8 py-6">분류</th>
                                <th className="px-8 py-6">일시</th>
                                <th className="px-8 py-6">지점/담당자/현장</th>
                                <th className="px-8 py-6">물품명 및 품번</th>
                                <th className="px-8 py-6">수량/상태</th>
                                <th className="px-8 py-6 text-right">증빙</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={7} className="py-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-[0.5em]">Syncing Inventory Data...</td></tr>
                            ) : filteredInspections.length === 0 ? (
                                <tr><td colSpan={7} className="py-20 text-center text-slate-400 font-bold">기록된 재고 데이터가 존재하지 않습니다.</td></tr>
                            ) : (
                                filteredInspections.map((item) => (
                                    <tr key={item.id} className={`group hover:bg-slate-50/80 transition-all ${selectedIds.has(item.id) ? 'bg-blue-50/40' : ''}`}>
                                        <td className="px-8 py-8"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded-lg accent-slate-900" /></td>
                                        <td className="px-8 py-8">
                                            <span className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase ${
                                                item.transaction_type === '입고' ? 'bg-emerald-100 text-emerald-700' :
                                                item.transaction_type === '출고' ? 'bg-blue-100 text-blue-700' :
                                                item.transaction_type === '폐기' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {item.transaction_type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-8 font-bold text-slate-400 text-xs">
                                            {new Date(item.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{item.branch} / {item.name}</span>
                                                <span className="text-sm font-black text-slate-800 tracking-tight">{item.business_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-black text-slate-900 tracking-tight">{item.item_name || '-'}</span>
                                                <span className="text-[10px] font-mono text-slate-400 font-bold">{item.item_code || 'No Code'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-black text-slate-900">x{item.quantity || 1}</span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.condition_status === '파손' ? 'text-rose-600 bg-rose-50' : 'text-slate-500 bg-slate-100'}`}>
                                                    {item.condition_status || '신품'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8 text-right">
                                            <button onClick={() => downloadZip(item.id)} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx global>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideInUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-slide-in-up { animation: slideInUp 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
}
