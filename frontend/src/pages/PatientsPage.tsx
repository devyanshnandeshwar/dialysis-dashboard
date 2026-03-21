import { useState, useEffect } from 'react';
import { getPatients } from '@/api/patients';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Loader2 } from 'lucide-react';
import AddPatientModal from '@/components/patient/AddPatientModal';
import AddSessionModal from '@/components/session/AddSessionModal';
import EditPatientModal from '@/components/patient/EditPatientModal';
import PatientHistoryModal from '@/components/patient/PatientHistoryModal';
import AnomalyBadge from '@/components/ui/AnomalyBadge';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from 'sonner';
import type { Patient } from '@/types';

// Simple hash for gradient matching
const gradients = [
  'from-blue-500 to-cyan-400',
  'from-purple-500 to-indigo-400',
  'from-rose-500 to-pink-400',
  'from-amber-500 to-orange-400',
  'from-emerald-500 to-teal-400',
];

function getGradientForName(name: string) {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

function getTodayStatusLabel(status?: 'not_started' | 'in_progress' | 'completed') {
  if (status === 'not_started') return 'Today: Scheduled';
  if (status === 'in_progress') return 'Today: In Progress';
  if (status === 'completed') return 'Today: Completed';
  return null;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [diagnosisFilter, setDiagnosisFilter] = useState('all');
  const [highRiskOnly, setHighRiskOnly] = useState(false);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await getPatients();
      setPatients(data);
    } catch {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handlePatientUpdated = (updated: Patient) => {
    setPatients(prev => prev.map(p => p._id === updated._id ? { ...p, ...updated } : p));
  };

  const handlePatientCreated = (created: Patient) => {
    // New patient won't have aggregated fields yet, provide defaults locally
    const newPatient = {
      ...created,
      totalSessions: 0,
      lastAnomalies: [],
      lastSession: null,
      todaySession: null,
    };
    setPatients(prev => [newPatient, ...prev]);
  };

  const diagnosisOptions = Array.from(
    new Set(
      patients
        .map((p) => p.primaryDiagnosis?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase());

    const normalizedDiagnosis = p.primaryDiagnosis?.trim() || '';
    const matchesDiagnosis = diagnosisFilter === 'all' || normalizedDiagnosis === diagnosisFilter;
    const isHighRisk = (p.lastAnomalies?.length || 0) > 0;
    const matchesRisk = !highRiskOnly || isHighRisk;

    return matchesSearch && matchesDiagnosis && matchesRisk;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 -mx-6 px-6 -mt-6 pt-6 pb-4 mb-6 backdrop-blur-sm bg-bg/80 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" />
            Patients Directory
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {patients.length} total registered patient{patients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <AddPatientModal onPatientCreated={handlePatientCreated} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="Search by name or MRN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-surface border-border text-text-primary focus-visible:border-accent focus-visible:ring-accent-glow"
          />
        </div>
        <select
          value={diagnosisFilter}
          onChange={(e) => setDiagnosisFilter(e.target.value)}
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-glow"
        >
          <option value="all">All Diagnoses</option>
          {diagnosisOptions.map((diagnosis) => (
            <option key={diagnosis} value={diagnosis}>
              {diagnosis}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setHighRiskOnly((prev) => !prev)}
          className={`h-10 rounded-md border px-3 text-sm font-medium transition-colors ${highRiskOnly
            ? 'border-warning text-warning bg-warning-bg'
            : 'border-border text-text-muted bg-surface hover:text-text-primary hover:bg-surface-hover'
            }`}
        >
          High-Risk Only
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4 mt-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full bg-surface-alt rounded-xl" />)}
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <Loader2 className="w-12 h-12 text-text-muted mx-auto opacity-30" />
          <p className="text-text-muted text-sm tracking-wide">No patients found matching your search.</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {filteredPatients.map((patient) => {
            const initial = patient.name.charAt(0).toUpperCase();
            const gradient = getGradientForName(patient.name);

            return (
              <Card key={patient._id} className="group bg-surface border border-border transition-all hover:bg-surface-hover shadow-sm rounded-xl">
                <CardContent className="p-2.5 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">

                  {/* Main Info w/ Avatar */}
                  <div className="min-w-0 md:min-w-56 flex-1 flex items-center gap-3 md:gap-3.5">
                    <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-inner bg-linear-to-br ${gradient}`}>
                      {initial}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-text-primary tracking-tight">{patient.name}</h3>
                        {patient.todaySession?.status && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-border-subtle bg-surface-alt text-text-secondary font-semibold uppercase tracking-wide">
                            {getTodayStatusLabel(patient.todaySession.status)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-secondary font-mono tracking-wide mt-1">{patient.mrn}</div>
                    </div>
                  </div>

                  {/* Patient Stats Columns */}
                  <div className="flex gap-4 lg:gap-6 text-sm flex-wrap items-center flex-1 border-l border-border-subtle pl-3.5 md:pl-4 py-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] tracking-widest text-text-muted uppercase font-bold">DRY WEIGHT</span>
                      <span className="font-medium text-text-primary">{patient.dryWeight} kg</span>
                    </div>
                    <div className="flex flex-col gap-1 w-36 truncate">
                      <span className="text-[10px] tracking-widest text-text-muted uppercase font-bold">DIAGNOSIS</span>
                      <span className="font-medium text-text-primary truncate" title={patient.primaryDiagnosis || 'None'}>
                        {patient.primaryDiagnosis || 'Unspecified'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] tracking-widest text-text-muted uppercase font-bold">SESSIONS</span>
                      <span className="font-medium text-text-primary">{patient.totalSessions || 0}</span>
                    </div>
                  </div>

                  {/* Last Session Box */}
                  <div className="w-full md:w-52 min-h-20 bg-surface-alt/40 p-1.5 rounded-lg border border-border-subtle flex flex-col justify-center gap-1 shrink-0 shadow-inner">
                    <div className="text-[10px] tracking-widest text-text-muted uppercase font-bold">LATEST SESSION</div>
                    {patient.lastSession ? (
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold text-text-primary">
                          {new Date(patient.lastSession.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <StatusBadge status={patient.lastSession.status} />
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted italic opacity-80">No sessions recorded</span>
                    )}
                    <div className="flex flex-wrap items-start gap-1.5 mt-1 min-h-5">
                      {patient.lastAnomalies && patient.lastAnomalies.length > 0 ? (
                        <>
                          {patient.lastAnomalies.slice(0, 2).map((anom, i) => (
                            <AnomalyBadge key={i} anomaly={anom} />
                          ))}
                          {patient.lastAnomalies.length > 2 && (
                            <span className="text-[10px] text-text-secondary font-semibold">+{patient.lastAnomalies.length - 2}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-text-muted uppercase tracking-wide">No alerts</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 shrink-0 w-full md:w-40">
                    {patient.todaySession ? (
                      <span className="h-9 w-full flex items-center justify-center text-[10px] px-2 py-1 rounded-full border border-success/40 bg-success-bg text-success font-semibold uppercase tracking-wide">
                        Scheduled
                      </span>
                    ) : (
                      <AddSessionModal
                        onSessionCreated={fetchPatients}
                        preselectedPatientId={patient._id}
                        lockPatient
                        triggerLabel="Schedule Today"
                        triggerClassName="w-full justify-center"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <div className="opacity-80 hover:opacity-100 transition-opacity flex-1">
                        <PatientHistoryModal patient={patient} triggerClassName="w-full justify-center" />
                      </div>
                      <div className="opacity-80 hover:opacity-100 transition-opacity">
                        <EditPatientModal patient={patient} onPatientUpdated={handlePatientUpdated} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
