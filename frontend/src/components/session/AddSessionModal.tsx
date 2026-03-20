import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import axios from 'axios';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getPatients, invalidatePatientsCache } from '@/api/patients';
import { getMachines } from '@/api/machines';
import { createSession } from '@/api/sessions';
import type { Patient, HDMachine } from '@/types';

interface Props {
  onSessionCreated: () => void;
  preselectedPatientId?: string;
  lockPatient?: boolean;
  triggerLabel?: string;
}

export default function AddSessionModal({
  onSessionCreated,
  preselectedPatientId,
  lockPatient = false,
  triggerLabel = 'Add Session',
}: Props) {
  const todayIso = new Date().toISOString().split('T')[0]!;

  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [machines, setMachines] = useState<HDMachine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [patientId, setPatientId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    todayIso
  );
  const [preWeight, setPreWeight] = useState('');
  const [preBpSystolic, setPreBpSystolic] = useState('');
  const [preBpDiastolic, setPreBpDiastolic] = useState('');
  const [targetDuration, setTargetDuration] = useState('240');
  const [status, setStatus] = useState('not_started');

  const availableMachines = machines.filter((machine) => machine.status === 'available');
  const allMachinesInUse = machines.length > 0 && availableMachines.length === 0;

  useEffect(() => {
    if (open) {
      setScheduledDate(todayIso);
      if (preselectedPatientId) {
        setPatientId(preselectedPatientId);
      }

      getPatients()
        .then(setPatients)
        .catch(() => toast.error('Failed to load patients'));

      setMachinesLoading(true);
      getMachines()
        .then((data) => {
          setMachines(data);
          const firstAvailable = data.find((machine) => machine.status === 'available');
          setMachineId((prev) => prev || firstAvailable?.id || '');
        })
        .catch(() => toast.error('Failed to load machines'))
        .finally(() => setMachinesLoading(false));
    }
  }, [open, preselectedPatientId, todayIso]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!patientId) newErrors.patientId = 'Patient is required';
    if (!machineId.trim()) newErrors.machineId = 'Machine ID is required';
    if (!scheduledDate) newErrors.scheduledDate = 'Date is required';
    if (!targetDuration || Number(targetDuration) <= 0) {
      newErrors.targetDuration = 'Target duration is required';
    }
    if (!preWeight || Number(preWeight) <= 0) {
      newErrors.preWeight = 'Pre-session weight is required';
    }
    if (!preBpSystolic || Number(preBpSystolic) <= 0) {
      newErrors.preBpSystolic = 'Systolic BP is required';
    }
    if (!preBpDiastolic || Number(preBpDiastolic) <= 0) {
      newErrors.preBpDiastolic = 'Diastolic BP is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setPatientId('');
    setMachineId('');
    setScheduledDate(todayIso);
    setPreWeight('');
    setPreBpSystolic('');
    setPreBpDiastolic('');
    setTargetDuration('240');
    setStatus('not_started');
    setErrors({});
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setErrors((prev) => ({ ...prev, scheduledDate: '' }));

    try {
      const body: Record<string, unknown> = {
        patientId,
        machineId: machineId.trim(),
        scheduledDate: new Date(scheduledDate).toISOString(),
        status,
        targetDurationMinutes: Number(targetDuration),
        preWeight: Number(preWeight),
        preBloodPressure: {
          systolic: Number(preBpSystolic),
          diastolic: Number(preBpDiastolic),
        },
      };
      await createSession(body as Parameters<typeof createSession>[0]);
      invalidatePatientsCache();
      const selectedPatient = patients.find((p) => p._id === patientId);
      toast.success(`Session started for ${selectedPatient?.name ?? 'patient'}`);
      resetForm();
      setOpen(false);
      onSessionCreated();
    } catch (error) {
      if (axios.isAxiosError<{ error?: string; details?: Array<{ msg?: string }> }>(error)) {
        const statusCode = error.response?.status;
        const backendError = error.response?.data?.error;
        const firstError = error.response?.data?.details?.[0]?.msg;

        if (statusCode === 409) {
          toast.error(backendError || 'Patient already has a session today');
          if (lockPatient) {
            setOpen(false);
          }
          return;
        }

        if (statusCode === 400 && backendError) {
          if (
            backendError === 'Cannot schedule a session in the past' ||
            backendError === 'Cannot schedule more than 30 days in advance'
          ) {
            setErrors((prev) => ({ ...prev, scheduledDate: backendError }));
          }
          toast.error(backendError);
          return;
        }

        toast.error(firstError || backendError || 'Failed to create session');
      } else {
        toast.error('Failed to create session');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    'bg-bg border-border text-text-primary text-sm placeholder:text-text-muted focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent-glow h-9';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-accent text-white hover:brightness-110 shadow-sm font-medium gap-1.5"
        >
          <Plus className="w-4 h-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-surface border-border shadow-2xl text-text-primary max-w-lg max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-4 border-b border-border-subtle bg-surface-alt/40">
          <DialogTitle className="text-text-primary text-lg font-bold">
            Record New Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          {/* Patient */}
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Patient *</Label>
            <Select value={patientId} onValueChange={setPatientId} disabled={lockPatient}>
              <SelectTrigger className={`w-full ${fieldClass}`}>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border-custom">
                {patients.map((p) => (
                  <SelectItem key={p._id} value={p._id} className="text-text-primary focus:bg-surface-alt">
                    {p.name} ({p.mrn})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.patientId && (
              <p className="text-xs text-critical">{errors.patientId}</p>
            )}
          </div>

          {/* Machine ID + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">
                Machine ID <span className="text-critical">*</span>
              </Label>
              <Select value={machineId} onValueChange={setMachineId} disabled={machinesLoading}>
                <SelectTrigger className={`w-full ${fieldClass}`}>
                  <SelectValue placeholder={machinesLoading ? 'Loading machines...' : 'Select machine'} />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border-custom">
                  {machines.map((machine) => {
                    const disabled = machine.status === 'in_use';
                    return (
                      <SelectItem
                        key={machine.id}
                        value={machine.id}
                        disabled={disabled}
                        className="text-text-primary focus:bg-surface-alt"
                      >
                        <span className={disabled ? 'text-critical' : 'text-success'}>
                          {machine.id} - {disabled ? 'In Use' : 'Available'}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.machineId && (
                <p className="text-xs text-critical">{errors.machineId}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">
                Scheduled Date *
              </Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={todayIso}
                className={fieldClass}
              />
              {errors.scheduledDate && (
                <p className="text-xs text-critical">{errors.scheduledDate}</p>
              )}
            </div>
          </div>

          {allMachinesInUse && (
            <div className="rounded-md border border-warning/40 bg-warning-bg px-3 py-2 text-xs text-warning font-medium">
              All machines are currently in use. Please wait for a session to complete.
            </div>
          )}

          {/* Target Duration */}
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">
              Target Duration (min) *
            </Label>
            <Input
              type="number"
              value={targetDuration}
              onChange={(e) => setTargetDuration(e.target.value)}
              className={fieldClass}
            />
            {errors.targetDuration && (
              <p className="text-xs text-critical">{errors.targetDuration}</p>
            )}
          </div>

          {/* Pre-Session Weight */}
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Pre-Session Weight (kg) *</Label>
            <Input
              type="number"
              step="0.1"
              value={preWeight}
              onChange={(e) => setPreWeight(e.target.value)}
              placeholder="75.0"
              className={fieldClass}
            />
            {errors.preWeight && (
              <p className="text-xs text-critical">{errors.preWeight}</p>
            )}
          </div>

          {/* Pre-BP Systolic */}
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Pre-BP Systolic *</Label>
            <Input
              type="number"
              value={preBpSystolic}
              onChange={(e) => setPreBpSystolic(e.target.value)}
              placeholder="Systolic"
              className={fieldClass}
            />
            {errors.preBpSystolic && (
              <p className="text-xs text-critical">{errors.preBpSystolic}</p>
            )}
          </div>

          {/* Pre-BP Diastolic */}
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Pre-BP Diastolic *</Label>
            <Input
              type="number"
              value={preBpDiastolic}
              onChange={(e) => setPreBpDiastolic(e.target.value)}
              placeholder="Diastolic"
              className={fieldClass}
            />
            {errors.preBpDiastolic && (
              <p className="text-xs text-critical">{errors.preBpDiastolic}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className={`w-full ${fieldClass}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border-custom">
                <SelectItem value="not_started" className="text-text-primary focus:bg-surface-alt">
                  Not Started
                </SelectItem>
                <SelectItem value="in_progress" className="text-text-primary focus:bg-surface-alt">
                  In Progress
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || allMachinesInUse || !machineId}
            className="w-full bg-accent text-white hover:brightness-110 shadow-md font-semibold text-sm mt-4 mb-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              'Start Session'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
