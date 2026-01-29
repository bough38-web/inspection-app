'use client';
import { useEffect, useState, useRef } from 'react';
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

// Helper to parse activity details string
const parseActivityDetails = (activityType: string) => {
    const result = {
        customer_1: '', customer_2: '',
        appearance_1: '', appearance_2: '',
        system_1: '', system_2: '', system_3: ''
    };
    if (!activityType) return result;

    // Category mapping: Tag name -> Array of { searchKey, targetField }
    const categoryConfig = [
        {
            tag: '[고객소통]',
            fields: [{ key: '장비사용불편', field: 'customer_1' }, { key: '서비스불만', field: 'customer_2' }]
        },
        {
            tag: '[환경점검]',
            fields: [{ key: '표지판', field: 'appearance_1' }, { key: '장비외관', field: 'appearance_2' }]
        },
        {
            tag: '[시스템]',
            fields: [{ key: '방범장비', field: 'system_1' }, { key: '영상장비', field: 'system_2' }]
        }
    ];

    categoryConfig.forEach(cat => {
        if (activityType.includes(cat.tag)) {
            // Find content after this tag until the next [ tag or end of string
            const startIdx = activityType.indexOf(cat.tag) + cat.tag.length;
            const nextTagIdx = activityType.indexOf('[', startIdx);
            const segment = nextTagIdx === -1
                ? activityType.substring(startIdx)
                : activityType.substring(startIdx, nextTagIdx);

            // Parse individual values like "안부:양호, 보안:조치완료"
            const pairs = segment.split(',').map(p => p.trim());
            pairs.forEach(pair => {
                const [k, v] = pair.split(':').map(val => val.trim());
                if (k && v) {
                    const match = cat.fields.find(f => f.key === k);
                    if (match) {
                        (result as any)[match.field] = v === '-' ? '' : v;
                    }
                }
            });
        }
    });

    // Handle (내역:...) part for customer_2
    if (activityType.includes('(내역:')) {
        const detailPart = activityType.match(/\(내역:([^)]+)\)/);
        if (detailPart && detailPart[1]) {
            result.customer_2 += ` (${detailPart[1]})`;
        }
    }

    return result;
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

    // Filter Inspections based on Login Context
    const [filteredInspections, setFilteredInspections] = useState<Inspection[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userBranch, setUserBranch] = useState('');

    const isInitialized = useRef(false);

    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        const role = localStorage.getItem('user_role');
        const branch = localStorage.getItem('branch_name') || '';

        console.log('Dashboard Init - Role:', role, 'Branch:', branch); // Debug log

        if (!role) {
            window.location.href = '/admin/login';
            return;
        }

        setUserRole(role);
        setUserBranch(branch);

        // Clear storage to force logout on refresh
        localStorage.removeItem('user_role');
        localStorage.removeItem('branch_name');
        localStorage.removeItem('is_admin');

        document.cookie = "is_admin=; path=/; max-age=0";
        document.cookie = "branch_name=; path=/; max-age=0";
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.href = '/admin/login';
    };

    useEffect(() => {
        if (!userRole) return; // Wait for role to be set

        if (userRole === 'branch') {
            if (userBranch) {
                setFilteredInspections(inspections.filter(i => i.branch === userBranch));
            } else {
                setFilteredInspections([]); // Safety: If branch user but no branch name, show nothing
            }
        } else {
            // Manager sees all
            setFilteredInspections(inspections);
        }
    }, [inspections, userRole, userBranch]);


    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredInspections.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredInspections.map(i => i.id)));
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

    const downloadExcel = async (onlySelected = false) => {
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
                { header: '방문자', key: 'name', width: 10 },
                { header: '서비스번호', key: 'contract_no', width: 15 },
                { header: '상호명', key: 'business_name', width: 20 },
                { header: '소통_불편', key: 'customer_1', width: 12 },
                { header: '소통_불만', key: 'customer_2', width: 25 },
                { header: '환경_표지판', key: 'appearance_1', width: 12 },
                { header: '환경_외관', key: 'appearance_2', width: 12 },
                { header: '시스템_방범', key: 'system_1', width: 12 },
                { header: '시스템_영상', key: 'system_2', width: 12 },
                { header: '사진1', key: 'photo1', width: 20 },
                { header: '사진2', key: 'photo2', width: 20 },
                { header: '사진3', key: 'photo3', width: 20 },
            ];
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            // Use filteredInspections or selected items for download
            const targetItems = onlySelected
                ? filteredInspections.filter(i => selectedIds.has(i.id))
                : filteredInspections;

            const total = targetItems.length;
            if (total === 0) {
                showToast('다운로드할 항목이 없습니다.', 'error');
                return;
            }

            for (let i = 0; i < total; i++) {
                const item = targetItems[i];
                const rowIndex = i + 2;
                const row = sheet.getRow(rowIndex);
                const details = parseActivityDetails(item.activity_type || '');
                row.values = {
                    id: item.id,
                    date: new Date(item.created_at).toLocaleDateString(),
                    branch: item.branch,
                    name: item.name,
                    contract_no: item.contract_no, // Will be empty for new items
                    business_name: item.business_name,
                    ...details
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
                                const colIndex = 13 + (p - 1);
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
            const fileName = onlySelected
                ? `현장점검_선택내역_${new Date().toISOString().slice(0, 10)}.xlsx`
                : `현장점검_전체내역_${new Date().toISOString().slice(0, 10)}.xlsx`;
            saveAs(new Blob([buf]), fileName);
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

    // Calculate Stats based on FILTERED data
    const branchStats = filteredInspections.reduce((acc, curr) => {
        acc[curr.branch] = (acc[curr.branch] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const sortedBranches = Object.entries(branchStats).sort((a, b) => b[1] - a[1]);
    const maxBranchCount = Math.max(...Object.values(branchStats), 1);

    // Manager Stats
    const managerStats = filteredInspections.reduce((acc, curr) => {
        const name = curr.name || '미지정';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const sortedManagers = Object.entries(managerStats).sort((a, b) => b[1] - a[1]);
    const maxManagerCount = Math.max(...Object.values(managerStats), 1);

    if (!userRole) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
            {/* Toast Notification */}
            <Toast message={toast.message} type={toast.type as any} />

            {/* Header Area with Glassmorphism */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        관리자 대시보드
                        {userRole === 'branch' && <span className="ml-2 text-xl font-medium text-blue-600">({userBranch})</span>}
                    </h1>
                    <p className="text-sm text-gray-500 mt-2 font-medium">실시간 현장 점검 데이터 및 파일 관리</p>
                </div>

                <div className="mt-4 md:mt-0 flex items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={handleLogout}
                        className="px-4 py-2.5 rounded-xl font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors shadow-sm"
                    >
                        로그아웃
                    </Button>
                    <Button
                        onClick={() => downloadExcel(false)}
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
                    {userRole === 'manager' && (
                        <Button
                            variant="secondary"
                            onClick={handleDeleteSelected}
                            className="px-4 py-2.5 rounded-xl font-semibold bg-red-50 hover:bg-red-100 text-red-600 border-red-100 transition-colors"
                            onDoubleClick={() => {
                                if (confirm('정말 모든 데이터를 초기화(전체 삭제)하시겠습니까?')) {
                                    setSelectedIds(new Set(filteredInspections.map(i => i.id)));
                                    setTimeout(() => handleDeleteSelected(), 100);
                                }
                            }}
                        >
                            초기화 (더블클릭)
                        </Button>
                    )}
                </div>
            </header>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="총 등록 건수" count={filteredInspections.length} color="text-blue-600" />
                <StatCard title="오늘 등록" count={filteredInspections.filter(i => new Date(i.created_at).toDateString() === new Date().toDateString()).length} color="text-indigo-600" />
                <StatCard title="사진 파일" count={filteredInspections.reduce((acc, curr) => acc + curr.photo_count, 0)} color="text-purple-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Branch Chart (Only show if Manager or multiple branches exist) */}
                <div className="lg:col-span-1 space-y-8">
                    {userRole === 'manager' && (
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
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
                                                style={{ width: `${(count / maxBranchCount) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Visitor Stats (Updated Label) */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><span className="w-2 h-6 bg-orange-500 rounded-full"></span>방문자별 성과</h2>
                        <div className="space-y-5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {sortedManagers.length === 0 && <div className="text-gray-400 text-center py-10 bg-gray-50 rounded-2xl">데이터가 없습니다</div>}
                            {sortedManagers.map(([manager, count]) => (
                                <div key={manager} className="space-y-2 group cursor-pointer">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="text-gray-600 group-hover:text-orange-600 transition-colors">{manager}</span>
                                        <span className="text-gray-900">{count}건</span>
                                    </div>
                                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-orange-500 rounded-full transition-all duration-700 ease-out group-hover:bg-orange-600"
                                            style={{ width: `${(count / maxManagerCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
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
                            <div className="animate-fade-in flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-lg border border-indigo-100">
                                <span className="text-sm font-bold text-indigo-600">{selectedIds.size}개 선택됨</span>
                                <button
                                    onClick={() => downloadExcel(true)}
                                    disabled={generatingExcel}
                                    className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shadow-md flex items-center gap-1"
                                >
                                    {generatingExcel ? '다운로드 중...' : '선택 엑셀 저장'}
                                </button>
                                <div className="w-px h-4 bg-gray-300 mx-1"></div>
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
                                            checked={filteredInspections.length > 0 && selectedIds.size === filteredInspections.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 transition-colors cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-4 w-12 text-center text-gray-900">No.</th>
                                    <th className="px-6 py-4 font-semibold">등록일시</th>
                                    <th className="px-6 py-4 font-semibold">지사</th>
                                    <th className="px-6 py-4 font-semibold">방문자/서비스번호/상호</th>
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
                                ) : filteredInspections.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-20 text-gray-400">데이터가 없습니다.</td></tr>
                                ) : (
                                    filteredInspections.map((item, index) => (
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
                                            <td className="px-6 py-4 text-center font-bold text-gray-400">
                                                {filteredInspections.length - index}
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
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-xs font-semibold py-0.5 px-1.5 bg-blue-50 text-blue-600 rounded">{item.name}</span>
                                                        {item.contract_no && (
                                                            <span className="text-xs text-slate-400 font-medium">#{item.contract_no}</span>
                                                        )}
                                                    </div>
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
