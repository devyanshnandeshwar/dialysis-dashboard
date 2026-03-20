import { useState, useEffect } from 'react';
import { getPatients } from '@/api/patients';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Loader2 } from 'lucide-react';
import AddPatientModal from '@/components/patient/AddPatientModal';
import EditPatientModal from '@/components/patient/EditPatientModal';
import PatientHistoryModal from '@/components/patient/PatientHistoryModal';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from 'sonner';
import type { Patient } from '@/types';

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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Users className="w-6 h-6 text-brand" />
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
          className="pl-9 bg-surface border-border-custom text-text-primary focus-visible:ring-brand"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3 mt-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full bg-surface-alt rounded-lg" />)}
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Loader2 className="w-10 h-10 text-text-muted mx-auto opacity-40" />
          <p className="text-text-muted text-sm">No patients found matching your search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPatients.map((patient) => (
            <Card key={patient._id} className="group bg-surface border-border-custom transition-colors hover:bg-surface-alt/30">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                
                {/* Main Info */}
                <div className="min-w-[200px] flex-1">
                  <h3 className="text-base font-bold text-text-primary font-medium">{patient.name}</h3>
                  <div className="text-xs text-text-muted font-mono mt-0.5">{patient.mrn}</div>
                </div>

                {/* Patient Stats Columns */}
                <div className="flex gap-6 lg:gap-10 text-sm flex-wrap items-center flex-1">
                   <div className="flex flex-col">
                     <span className="text-[11px] text-text-muted uppercase font-semibold">Dry Weight</span>
                     <span className="font-medium text-text-primary">{patient.dryWeight} kg</span>
                   </div>
                   <div className="flex flex-col w-32 truncate">
                     <span className="text-[11px] text-text-muted uppercase font-semibold">Diagnosis</span>
                     <span className="font-medium text-text-primary truncate" title={patient.primaryDiagnosis || 'None'}>
                        {patient.primaryDiagnosis || 'Not specified'}
                     </span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[11px] text-text-muted uppercase font-semibold">Sessions</span>
                     <span className="font-medium text-text-primary">{patient.totalSessions || 0}</span>
                   </div>
                </div>

                {/* Last Session Box */}
                <div className="min-w-[180px] bg-surface-alt/40 p-2.5 rounded-md border border-border-custom/50 flex flex-col gap-1.5 shrink-0">
                  <div className="text-[11px] text-text-muted uppercase font-semibold">Last Session</div>
                  {patient.lastSession ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-primary">
                        {new Date(patient.lastSession.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <StatusBadge status={patient.lastSession.status} />
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted italic">No sessions yet</span>
                  )}
                  {patient.lastAnomalies && patient.lastAnomalies.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {patient.lastAnomalies.map((anom, i) => (
                         <div key={i} className={`w-2 h-2 rounded-full ${anom.severity === 'critical' ? 'bg-critical' : 'bg-warning'}`} title={anom.message} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-border-custom/50 pt-3 md:pt-0 md:pl-4 mt-2 md:mt-0 items-end md:items-center">
                   <PatientHistoryModal patient={patient} />
                   <div className="md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <EditPatientModal patient={patient} onPatientUpdated={handlePatientUpdated} />
                   </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
