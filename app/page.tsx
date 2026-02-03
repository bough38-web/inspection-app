import { InspectionForm } from './components/InspectionForm';

export default function Home() {
  return (
    <main className="min-h-screen sm:min-h-0 h-[100dvh] bg-gray-50 flex items-center justify-center p-0 sm:py-12 sm:px-4">
      <div className="w-full h-full sm:h-auto max-w-lg space-y-0 sm:space-y-8 flex flex-col sm:block">
        <div className="text-center mb-6 pt-6 sm:pt-0">
          <a href="/map" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            지도에서 찾기
          </a>
        </div>
        <InspectionForm />
      </div>
    </main>
  );
}
