import { InspectionForm } from './components/InspectionForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            현장 점검 앱
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            현장 점검 내용을 빠르고 정확하게 등록하세요.
          </p>
        </div>
        <InspectionForm />
      </div>
    </main>
  );
}
