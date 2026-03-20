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
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getPatients } from '@/api/patients';
import { createSession } from '@/api/sessions';
import type { Patient } from '@/types';

interface Props {
  onSessionCreated: () => void;
}

export default function AddSessionModal({ onSessionCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [patientId, setPatientId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]!
  );
  const [preWeight, setPreWeight] = useState('');
  const [preBpSystolic, setPreBpSystolic] = useState('');
  const [preBpDiastolic, setPreBpDiastolic] = useState('');
  const [targetDuration, setTargetDuration] = useState('240');
  const [status, setStatus] = useState('not_started');

  useEffect(() => {
    if (open) {
      getPatients()
        .then(setPatients)
        .catch(() => toast.error('Failed to load patients'));
    }
  }, [open]);

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
    setScheduledDate(new Date().toISOString().split('T')[0]!);
    setPreWeight('');
    setPreBpSystolic('');
    setPreBpDiastolic('');
    setTargetDuration('240');
    setStatus('not_started');
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

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
      const selectedPatient = patients.find((p) => p._id === patientId);
      toast.success(`Session started for ${selectedPatient?.name ?? 'patient'}`);
      resetForm();
      setOpen(false);
      onSessionCreated();
    } catch {
      toast.error('Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    'bg-bg border-border text-text-primary text-sm placeholder:text-text-muted focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent-glow h-9';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-accent text-white hover:brightness-110 shadow-sm font-medium gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Session
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
            <Select value={patientId} onValueChange={setPatientId}>
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
              <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Machine ID *</Label>
              <Input
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                placeholder="M-101"
                className={fieldClass}
              />
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
                className={fieldClass}
              />
              {errors.scheduledDate && (
                <p className="text-xs text-critical">{errors.scheduledDate}</p>
              )}
            </div>
          </div>

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
            disabled={submitting}
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
