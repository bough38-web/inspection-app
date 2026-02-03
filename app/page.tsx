import { InspectionForm } from './components/InspectionForm';

export default function Home() {
  return (
    <main className="min-h-screen sm:min-h-0 h-[100dvh] bg-gray-50 flex items-center justify-center p-0 sm:py-12 sm:px-4">
      <div className="w-full h-full sm:h-auto max-w-lg space-y-0 sm:space-y-8 flex flex-col sm:block">
        <div className="text-center mb-6 pt-6 sm:pt-0">
          <h1 className="text-2xl font-bold text-gray-800">현장 점검 시스템</h1>
        </div>
        <InspectionForm />
      </div>
    </main>
  );
}
