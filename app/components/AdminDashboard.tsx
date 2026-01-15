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
                { header: '활동내역', key: 'activity_type', width: 40 },
                { header: '사진1', key: 'photo1', width: 20 },
                { header: '사진2', key: 'photo2', width: 20 },
                { header: '사진3', key: 'photo3', width: 20 },
            ];

            // Style Header
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            const total = inspections.length;

            for (let i = 0; i < total; i++) {
                const item = inspections[i];
                const rowIndex = i + 2;
                const row = sheet.getRow(rowIndex);

                // Basic Data
                row.values = {
                    id: item.id,
                    date: new Date(item.created_at).toLocaleDateString(),
                    branch: item.branch,
                    name: item.name,
                    contract_no: item.contract_no,
                    business_name: item.business_name,
                    activity_type: item.activity_type || '-',
                };

                // Set Row Height for Images
                row.height = 100; // Pixel height approx
                row.alignment = { vertical: 'middle' };

                // Fetch and Embed Images
                if (item.folder_path) {
                    // Loop 3 times for max 3 photos
                    for (let p = 1; p <= 3; p++) {
                        const imgPath = `${item.folder_path}/${p}.webp`;
                        try {
                            // Fetch via Proxy to bypass CORS/Auth
                            const res = await fetch(`/api/proxy-image?path=${encodeURIComponent(imgPath)}`);
                            if (res.ok) {
                                const webpBlob = await res.blob();
                                // Convert WebP to PNG for ExcelJS
                                const pngBuffer = await convertWebPToPNG(webpBlob);

                                const imageId = workbook.addImage({
                                    buffer: pngBuffer,
                                    extension: 'png',
                                });

                                // Add to sheet
                                // col: 7 is H (0-indexed), 8 is I, 9 is J
                                const colIndex = 7 + (p - 1);

                                // Proper casting for floating positioning which ExcelJS supports but might have TS issues
                                sheet.addImage(imageId, {
                                    tl: { col: colIndex, row: rowIndex - 1 },
                                    br: { col: colIndex + 1, row: rowIndex },
                                    editAs: 'oneCell'
                                } as any);
                            }
                        } catch (e) {
                            // Silent fail for missing images or conversion errors
                            // console.warn(`Image ${p} skip for row ${rowIndex}`);
                        }
                    }
                }

                // Update Progress
                setProgress(Math.round(((i + 1) / total) * 100));
            }

            // Generate Blob and Download
            const buf = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buf]), `현장점검_내역_${new Date().toISOString().slice(0, 10)}.xlsx`);

        } catch (error) {
            console.error('Excel generation failed:', error);
            alert('엑셀 생성 중 오류가 발생했습니다. (콘솔 확인 필요)');
        } finally {
            setGeneratingExcel(false);
            setProgress(0);
        }
    };

    useEffect(() => {
        fetch('/api/inspections')
            .then(res => res.json())
            .then(data => {
                // Ensure data is an array before setting
                if (Array.isArray(data)) {
                    setInspections(data);
                } else {
                    console.error('Invalid data format:', data);
                    setInspections([]);
                }
            })
            .catch(err => console.error('Failed to load data', err))
            .finally(() => setLoading(false));
    }, []);

    const downloadZip = async (id: string, name: string) => {
        try {
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
                            onClick={downloadExcel}
                            disabled={generatingExcel}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${generatingExcel ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white`}
                        >
                            {generatingExcel ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    생성 중 ({progress}%)
                                </span>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    엑셀 다운로드 (이미지 포함)
                                </>
                            )}
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
