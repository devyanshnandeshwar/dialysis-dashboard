import { useState } from 'react';
import { usePatients } from '@/hooks/usePatients';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Search, UserX } from 'lucide-react';
import AddPatientModal from '@/components/patient/AddPatientModal';
import AddSessionModal from '@/components/session/AddSessionModal';
import EditPatientModal from '@/components/patient/EditPatientModal';
import PatientHistoryModal from '@/components/patient/PatientHistoryModal';
import AnomalyBadge from '@/components/ui/AnomalyBadge';
import StatusBadge from '@/components/ui/StatusBadge';
import { useAuth } from '@/context/AuthContext';

/* Avatars used to hash the name into one of five decorative gradients. On a
   screen where every other color encodes clinical severity, a color that means
   nothing competes with the ones that do. Neutral monogram instead. */

function getTodayStatusLabel(status?: 'not_started' | 'in_progress' | 'completed') {
  if (status === 'not_started') return 'Today';
  if (status === 'in_progress') return 'On machine';
  if (status === 'completed') return 'Done today';
  return null;
}

export default function PatientsPage() {
  const { patients, loading, fetchPatients, updatePatient, addPatient } = usePatients();
  const { can } = useAuth();
  
  const [search, setSearch] = useState('');
  const [diagnosisFilter, setDiagnosisFilter] = useState('all');
  const [highRiskOnly, setHighRiskOnly] = useState(false);

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
    <div className="max-w-7xl mx-auto space-y-4 pb-10">
      {/* Header. Filters live inside the glass panel so the page has one piece
          of chrome instead of a blurred bar followed by a loose control row. */}
      <div className="glass sticky top-0 z-10 rounded-xl px-4 py-3 mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-fg" />
              Patients Directory
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {patients.length} registered patient{patients.length !== 1 ? 's' : ''}
            </p>
          </div>
          {can('patient:create') && <AddPatientModal onPatientCreated={addPatient} />}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Search by name or MRN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 bg-surface border-border text-text-primary placeholder:text-text-muted focus-visible:border-accent-solid"
            />
          </div>
          <Select value={diagnosisFilter} onValueChange={setDiagnosisFilter}>
            <SelectTrigger
              size="sm"
              aria-label="Filter by diagnosis"
              className="h-9 w-full sm:w-52 bg-surface border-border text-text-primary"
            >
              <SelectValue placeholder="All Diagnoses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Diagnoses</SelectItem>
              {diagnosisOptions.map((diagnosis) => (
                <SelectItem key={diagnosis} value={diagnosis}>
                  {diagnosis}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            aria-pressed={highRiskOnly}
            onClick={() => setHighRiskOnly((prev) => !prev)}
            className={`h-9 shrink-0 rounded-md border px-3 text-sm font-medium transition-colors ${
              highRiskOnly
                ? 'border-warning-edge bg-warning-tint text-warning-fg'
                : 'border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            High-Risk Only
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full bg-surface-alt rounded-xl" />
          ))}
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <UserX className="w-12 h-12 text-text-muted mx-auto opacity-30" />
          <p className="text-text-muted text-sm">
            {patients.length === 0
              ? 'No patients registered yet.'
              : 'No patients match your current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPatients.map((patient, i) => {
            const initial = patient.name.charAt(0).toUpperCase();

            return (
              <div
                key={patient._id}
                className="surface-panel animate-row-in group rounded-xl px-4 py-3 transition-colors duration-200 hover:bg-surface-hover/40"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  {/* Identity. Fixed, for the same reason as the session card:
                      a flexible identity column shifts every column after it. */}
                  <div className="flex w-52 min-w-0 shrink-0 items-center gap-3">
                    <Avatar className="size-9 shrink-0 border border-border">
                      <AvatarFallback className="bg-surface-alt text-sm font-semibold text-text-secondary">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-semibold text-text-primary">
                        {patient.name}
                      </h3>
                      {/* Badge sits under the name rather than beside it: on a
                          fixed-width column a sibling chip squeezes the name
                          down to an ellipsis. */}
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-text-secondary">
                          {patient.mrn}
                        </span>
                        {patient.todaySession?.status && (
                          <span className="shrink-0 rounded-full border border-accent-edge bg-accent-tint px-1.5 text-[10px] font-semibold text-accent-fg">
                            {getTodayStatusLabel(patient.todaySession.status)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Demographics. A fixed grid rather than a wrapping flex row,
                      so the labels line up card to card instead of landing at a
                      different x-position on every row. */}
                  <dl className="flex shrink-0 flex-wrap gap-x-3 gap-y-2">
                    {[
                      { label: 'Gender', value: patient.gender || '--', width: 'w-14' },
                      { label: 'Phone', value: patient.phoneNumber || '--', width: 'w-20' },
                      { label: 'Dry weight', value: `${patient.dryWeight} kg`, width: 'w-20' },
                      { label: 'Sessions', value: String(patient.totalSessions || 0), width: 'w-12' },
                      { label: 'Diagnosis', value: patient.primaryDiagnosis || 'Unspecified', width: 'w-36' },
                    ].map(({ label, value, width }) => (
                      <div key={label} className={`min-w-0 ${width}`}>
                        <dt className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                          {label}
                        </dt>
                        <dd
                          className="mt-0.5 truncate text-sm font-medium text-text-primary"
                          title={value}
                        >
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {/* Latest session */}
                  <div className="min-w-0 flex-1 basis-40">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Latest session
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {patient.lastSession ? (
                        <>
                          <span className="text-sm font-medium text-text-primary tabular-nums">
                            {new Date(patient.lastSession.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <StatusBadge status={patient.lastSession.status} />
                          {patient.lastAnomalies?.slice(0, 2).map((anom, i) => (
                            <AnomalyBadge key={i} anomaly={anom} />
                          ))}
                          {(patient.lastAnomalies?.length || 0) > 2 && (
                            <span className="text-[11px] font-medium text-text-secondary">
                              +{(patient.lastAnomalies?.length || 0) - 2}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-text-muted">No sessions recorded</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ml-auto flex shrink-0 items-center gap-1.5">
                    {patient.todaySession ? (
                      <span className="inline-flex h-8 items-center rounded-md border border-success-edge bg-success-tint px-2.5 text-xs font-medium text-success-fg">
                        Scheduled
                      </span>
                    ) : (
                      can('session:create') && (
                        <AddSessionModal
                          onSessionCreated={fetchPatients}
                          preselectedPatientId={patient._id}
                          lockPatient
                          triggerLabel="Schedule"
                        />
                      )
                    )}
                    <PatientHistoryModal patient={patient} />
                    {can('patient:edit') && (
                      <EditPatientModal patient={patient} onPatientUpdated={updatePatient} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
