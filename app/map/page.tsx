'use client';

import { Map, MapMarker, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Target {
    id: string;
    business_name: string;
    address: string;
    lat: number;
    lng: number;
    contract_no: string;
    branch: string;
    manager: string;
}

export default function MapPage() {
    // Replace with your actual Kakao App JavaScript Key
    // Using environment variable from .env.local
    const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_API_KEY || process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '';

    const [targets, setTargets] = useState<Target[]>([]);
    const [filteredTargets, setFilteredTargets] = useState<Target[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
    const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.9780 });
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [loadingSdk, errorSdk] = useKakaoLoader({
        appkey: KAKAO_KEY,
        libraries: ['services', 'clusterer'],
    });

    useEffect(() => {
        fetch('/api/targets')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setTargets(data);
                    setFilteredTargets(data);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredTargets(targets);
        } else {
            const lower = searchTerm.toLowerCase();
            setFilteredTargets(targets.filter(t =>
                t.business_name.toLowerCase().includes(lower) ||
                t.branch.toLowerCase().includes(lower) ||
                t.manager.toLowerCase().includes(lower)
            ));
        }
    }, [searchTerm, targets]);

    const handleRegisterClick = (target: Target) => {
        const params = new URLSearchParams({
            business_name: target.business_name,
            branch: target.branch,
            name: target.manager, // manager maps to name in form
            service_no: target.contract_no,
        });
        router.push(`/?${params.toString()}`);
    };

    const handleNavigationClick = (target: Target) => {
        // Kakao Map URL Scheme
        // Web: https://map.kakao.com/link/to/Name,Lat,Lng
        // This opens the "Directions" page with the destination preset. User just needs to confirm "Current Location" as start.
        const url = `https://map.kakao.com/link/to/${target.business_name},${target.lat},${target.lng}`;
        window.open(url, '_blank');
    };

    const handleMyLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setMapCenter({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (err) => alert("위치 정보를 확인할 수 없습니다.")
            );
        }
    };

    if (loadingSdk || loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (errorSdk) {
        return <div className="p-8 text-center text-red-600 font-bold">지도 로드 실패: {errorSdk.message}</div>;
    }

    return (
        <div className="w-full h-screen relative">
            {/* Header / Back Button / Search */}
            <div className="absolute top-4 left-4 right-4 z-20 flex gap-3 pointer-events-none">
                <button
                    onClick={() => router.push('/')}
                    className="bg-white shadow-md rounded-full p-3 hover:bg-gray-100 transition-colors pointer-events-auto shrink-0 h-12 w-12 flex items-center justify-center"
                >
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div className="flex-1 pointer-events-auto max-w-md bg-white rounded-full shadow-md flex items-center px-5 h-12">
                    <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="상호명, 지사, 담당자 검색..."
                        className="w-full outline-none text-gray-700 font-medium bg-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* My Location Button */}
            <div className="absolute bottom-6 right-4 z-20">
                <button
                    onClick={handleMyLocation}
                    className="bg-white shadow-lg rounded-full p-4 hover:bg-blue-50 text-blue-600 transition-all active:scale-95 border border-blue-100"
                    title="내 위치로 이동"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
            </div>

            <Map
                center={mapCenter}
                style={{ width: '100%', height: '100%' }}
                level={9}
                onClick={() => setSelectedTarget(null)}
            >
                {filteredTargets.map((target) => (
                    <MapMarker
                        key={target.id}
                        position={{ lat: target.lat, lng: target.lng }}
                        onClick={() => setSelectedTarget(target)}
                        image={{
                            src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
                            size: { width: 24, height: 35 },
                        }}
                        title={target.business_name}
                    />
                ))}

                {selectedTarget && (
                    <CustomOverlayMap
                        position={{ lat: selectedTarget.lat, lng: selectedTarget.lng }}
                        yAnchor={1.4}
                    >
                        <div className="bg-white rounded-xl shadow-xl w-64 overflow-hidden animate-fade-in-up border border-gray-100">
                            <div className="bg-blue-600 px-4 py-3 flex justify-between items-start">
                                <h3 className="text-white font-bold text-sm truncate pr-2">{selectedTarget.business_name}</h3>
                                <button onClick={() => setSelectedTarget(null)} className="text-blue-200 hover:text-white">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="p-4 space-y-2">
                                <p className="text-gray-600 text-xs flex items-start gap-1">
                                    <svg className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <span className="break-keep">{selectedTarget.address}</span>
                                </p>
                                <div className="flex justify-between items-center text-xs text-gray-500 pt-1 border-t border-gray-50">
                                    <span>{selectedTarget.branch}</span>
                                    <span className="font-semibold text-blue-600">{selectedTarget.manager}</span>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => handleNavigationClick(selectedTarget)}
                                        className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold py-2 rounded-lg transition-colors shadow-sm active:scale-95 flex items-center justify-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        길안내
                                    </button>
                                    <button
                                        onClick={() => handleRegisterClick(selectedTarget)}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors shadow-sm active:scale-95"
                                    >
                                        점검 등록
                                    </button>
                                </div>
                            </div>
                        </div>
                    </CustomOverlayMap>
                )}
            </Map>
        </div>
    );
}
