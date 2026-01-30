import { InspectionForm } from './components/InspectionForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
        </div>
        <InspectionForm />
      </div>
    </main>
  );
}
