import { useState, useEffect } from 'react';
import { getPatients } from '@/api/patients';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Loader2, AlertTriangle } from 'lucide-react';
import AddPatientModal from '@/components/patient/AddPatientModal';
import EditPatientModal from '@/components/patient/EditPatientModal';
import PatientHistoryModal from '@/components/patient/PatientHistoryModal';
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

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
    const newPatient = { ...created, totalSessions: 0, lastAnomalies: [], lastSession: null };
    setPatients(prev => [newPatient, ...prev]);
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.mrn.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 -mx-6 px-6 -mt-6 pt-6 pb-4 mb-6 backdrop-blur-sm bg-bg/80 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" />
            Patients Directory
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {patients.length} total registered patient{patients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <AddPatientModal onPatientCreated={handlePatientCreated} />
      </div>

      {/* Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input 
          placeholder="Search by name or MRN..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-surface border-border text-text-primary focus-visible:border-accent focus-visible:ring-accent-glow"
        />
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
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-5">
                  
                  {/* Main Info w/ Avatar */}
                  <div className="min-w-[240px] flex-1 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-inner bg-gradient-to-br ${gradient}`}>
                      {initial}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-text-primary tracking-tight">{patient.name}</h3>
                      <div className="text-xs text-text-secondary font-mono tracking-wide mt-1">{patient.mrn}</div>
                    </div>
                  </div>

                  {/* Patient Stats Columns */}
                  <div className="flex gap-8 lg:gap-12 text-sm flex-wrap items-center flex-1 border-l border-border-subtle pl-6 py-1">
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
                  <div className="min-w-[200px] bg-surface-alt/40 p-3 rounded-lg border border-border-subtle flex flex-col gap-2 shrink-0 shadow-inner">
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
                    {patient.lastAnomalies && patient.lastAnomalies.length > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        {patient.lastAnomalies.slice(0, 2).map((anom, i) => (
                          <div key={i} className={`flex items-center gap-1.5 text-[10px] tracking-wide font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${anom.severity === 'critical' ? 'bg-critical-bg text-critical border-[rgba(240,79,79,0.3)]' : 'bg-warning-bg text-warning border-[rgba(240,165,0,0.3)]'}`} title={anom.message}>
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[80px]">{anom.type.replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                        {patient.lastAnomalies.length > 2 && (
                          <span className="text-[10px] text-text-muted font-bold">+{patient.lastAnomalies.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex md:flex-col gap-2 shrink-0 pt-3 md:pt-0 pl-1 mt-2 md:mt-0 justify-center items-center">
                     <div className="md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                       <PatientHistoryModal patient={patient} />
                     </div>
                     <div className="md:opacity-0 md:group-hover:opacity-100 transition-opacity mt-1">
                        <EditPatientModal patient={patient} onPatientUpdated={handlePatientUpdated} />
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
