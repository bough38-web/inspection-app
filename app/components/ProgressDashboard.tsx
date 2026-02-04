'use client';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Button } from './ui/Button';

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

interface ProgressDashboardProps {
    inspections: Inspection[];
    onBack: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

export function ProgressDashboard({ inspections, onBack }: ProgressDashboardProps) {

    // 1. Branch Data Processing
    const branchData = useMemo(() => {
        const counts: Record<string, number> = {};
        inspections.forEach(i => {
            const branch = i.branch || '미지정';
            counts[branch] = (counts[branch] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [inspections]);

    // 2. Individual Data Processing (Top 15 for readability)
    const individualData = useMemo(() => {
        const counts: Record<string, number> = {};
        inspections.forEach(i => {
            const name = i.name || '미지정';
            counts[name] = (counts[name] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
        // .slice(0, 20); // Show top 20
    }, [inspections]);

    // Split Individual Data into Top and Bottom halves if too many
    const [topIndividuals, bottomIndividuals] = useMemo(() => {
        const mid = Math.ceil(individualData.length / 2);
        return [individualData.slice(0, mid), individualData.slice(mid)];
    }, [individualData]);


    // 3. Summary Logic
    const summary = useMemo(() => {
        if (inspections.length === 0) return "데이터가 없습니다.";

        const total = inspections.length;
        const topBranch = branchData[0];
        const topIndividual = individualData[0];

        return (
            <div className="space-y-2 text-gray-700">
                <p>
                    총 <span className="font-bold text-blue-600">{total}</span>건의 점검이 진행되었습니다.
                </p>
                {topBranch && (
                    <p>
                        가장 많은 점검을 수행한 지사는 <span className="font-bold text-indigo-600">{topBranch.name}</span>
                        (<span className="font-bold">{topBranch.count}</span>건)입니다.
                    </p>
                )}
                {topIndividual && (
                    <p>
                        개인별 성과 1위는 <span className="font-bold text-emerald-600">{topIndividual.name}</span>
                        (<span className="font-bold">{topIndividual.count}</span>건)님 입니다.
                    </p>
                )}
            </div>
        );
    }, [inspections, branchData, individualData]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-xl">
                    <p className="label font-bold text-gray-700">{`${label}`}</p>
                    <p className="text-blue-600">{`건수: ${payload[0].value}건`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        진행현황 대시보드
                    </h1>
                    <p className="text-sm text-gray-500 mt-2 font-medium">실시간 지사별 및 개인별 성과 분석</p>
                </div>
                <Button onClick={onBack} variant="secondary" className="px-5 py-2.5 rounded-xl font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                    ← 목록으로 돌아가기
                </Button>
            </div>

            {/* Summary Review Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-3xl border border-blue-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📊</span> 요약 리뷰
                </h2>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-50/50 text-lg leading-relaxed">
                    {summary}
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Branch Chart */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 pl-2 border-l-4 border-blue-500">지사별 점검 현황</h3>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={branchData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#4B5563', fontSize: 12 }} />
                                <YAxis stroke="#9CA3AF" tick={{ fill: '#4B5563', fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6' }} />
                                <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} barSize={50}>
                                    <LabelList dataKey="count" position="top" fill="#6B7280" fontSize={12} fontWeight="bold" />
                                    {branchData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Individual Chart - Top Half */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 pl-2 border-l-4 border-emerald-500">개인별 점검 현황 (상위)</h3>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topIndividuals} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                <XAxis dataKey="name" stroke="#9CA3AF" interval={0} angle={-45} textAnchor="end" height={60} tick={{ fill: '#4B5563', fontSize: 12 }} />
                                <YAxis stroke="#9CA3AF" tick={{ fill: '#4B5563', fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6' }} />
                                <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]}>
                                    <LabelList dataKey="count" position="top" fill="#6B7280" fontSize={12} fontWeight="bold" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Individual Chart - Bottom Half (if needed) */}
                {bottomIndividuals.length > 0 && (
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 pl-2 border-l-4 border-gray-400">개인별 점검 현황 (하위)</h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={bottomIndividuals} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                    <XAxis dataKey="name" stroke="#9CA3AF" interval={0} angle={-45} textAnchor="end" height={60} tick={{ fill: '#4B5563', fontSize: 12 }} />
                                    <YAxis stroke="#9CA3AF" tick={{ fill: '#4B5563', fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6' }} />
                                    <Bar dataKey="count" fill="#9CA3AF" radius={[8, 8, 0, 0]}>
                                        <LabelList dataKey="count" position="top" fill="#6B7280" fontSize={12} fontWeight="bold" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
