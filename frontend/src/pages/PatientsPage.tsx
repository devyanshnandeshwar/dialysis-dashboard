import { Users } from 'lucide-react';

export default function PatientsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
        <Users className="w-6 h-6 text-brand" />
        Patients
      </h1>
      <div className="bg-surface border border-border-custom rounded-lg p-12 text-center">
        <p className="text-text-muted text-sm">Patient management coming soon.</p>
      </div>
    </div>
  );
}
