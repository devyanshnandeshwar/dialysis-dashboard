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
import { Textarea } from '@/components/ui/textarea';
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
  const [postWeight, setPostWeight] = useState('');
  const [preBpSystolic, setPreBpSystolic] = useState('');
  const [preBpDiastolic, setPreBpDiastolic] = useState('');
  const [postBpSystolic, setPostBpSystolic] = useState('');
  const [postBpDiastolic, setPostBpDiastolic] = useState('');
  const [sessionDuration, setSessionDuration] = useState('');
  const [targetDuration, setTargetDuration] = useState('240');
  const [status, setStatus] = useState('not_started');
  const [nurseNotes, setNurseNotes] = useState('');

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
    if (!scheduledDate) newErrors.scheduledDate = 'Date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setPatientId('');
    setMachineId('');
    setScheduledDate(new Date().toISOString().split('T')[0]!);
    setPreWeight('');
    setPostWeight('');
    setPreBpSystolic('');
    setPreBpDiastolic('');
    setPostBpSystolic('');
    setPostBpDiastolic('');
    setSessionDuration('');
    setTargetDuration('240');
    setStatus('not_started');
    setNurseNotes('');
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        patientId,
        scheduledDate: new Date(scheduledDate).toISOString(),
        status,
        targetDurationMinutes: Number(targetDuration),
      };

      if (machineId) body.machineId = machineId;
      if (preWeight) body.preWeight = Number(preWeight);
      if (postWeight) body.postWeight = Number(postWeight);
      if (sessionDuration)
        body.sessionDurationMinutes = Number(sessionDuration);
      if (nurseNotes) body.nurseNotes = nurseNotes;

      if (preBpSystolic && preBpDiastolic) {
        body.preBloodPressure = {
          systolic: Number(preBpSystolic),
          diastolic: Number(preBpDiastolic),
        };
      }
      if (postBpSystolic && postBpDiastolic) {
        body.postBloodPressure = {
          systolic: Number(postBpSystolic),
          diastolic: Number(postBpDiastolic),
        };
      }

      await createSession(body as Parameters<typeof createSession>[0]);
      toast.success('Session recorded');
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
    'bg-surface-alt border-border-custom text-text-primary placeholder:text-text-muted focus-visible:ring-brand';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-brand text-white hover:bg-brand/90 gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Session
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-surface border-border-custom text-text-primary max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-text-primary">
            Record New Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Patient */}
          <div className="space-y-1.5">
            <Label className="text-text-muted text-xs">Patient *</Label>
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
              <Label className="text-text-muted text-xs">Machine ID</Label>
              <Input
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                placeholder="M-101"
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-text-muted text-xs">
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

          {/* Weights */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-text-muted text-xs">Pre-weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={preWeight}
                onChange={(e) => setPreWeight(e.target.value)}
                placeholder="75.0"
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-text-muted text-xs">
                Post-weight (kg)
              </Label>
              <Input
                type="number"
                step="0.1"
                value={postWeight}
                onChange={(e) => setPostWeight(e.target.value)}
                placeholder="72.5"
                className={fieldClass}
              />
            </div>
          </div>

          {/* Pre-BP */}
          <div className="space-y-1.5">
            <Label className="text-text-muted text-xs">
              Pre-Blood Pressure (mmHg)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                value={preBpSystolic}
                onChange={(e) => setPreBpSystolic(e.target.value)}
                placeholder="Systolic"
                className={fieldClass}
              />
              <Input
                type="number"
                value={preBpDiastolic}
                onChange={(e) => setPreBpDiastolic(e.target.value)}
                placeholder="Diastolic"
                className={fieldClass}
              />
            </div>
          </div>

          {/* Post-BP */}
          <div className="space-y-1.5">
            <Label className="text-text-muted text-xs">
              Post-Blood Pressure (mmHg)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                value={postBpSystolic}
                onChange={(e) => setPostBpSystolic(e.target.value)}
                placeholder="Systolic"
                className={fieldClass}
              />
              <Input
                type="number"
                value={postBpDiastolic}
                onChange={(e) => setPostBpDiastolic(e.target.value)}
                placeholder="Diastolic"
                className={fieldClass}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-text-muted text-xs">
                Session Duration (min)
              </Label>
              <Input
                type="number"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(e.target.value)}
                placeholder="240"
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-text-muted text-xs">
                Target Duration (min)
              </Label>
              <Input
                type="number"
                value={targetDuration}
                onChange={(e) => setTargetDuration(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-text-muted text-xs">Status</Label>
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
                <SelectItem value="completed" className="text-text-primary focus:bg-surface-alt">
                  Completed
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-text-muted text-xs">Nurse Notes</Label>
            <Textarea
              value={nurseNotes}
              onChange={(e) => setNurseNotes(e.target.value)}
              placeholder="Optional clinical notes..."
              rows={3}
              className={fieldClass}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-brand text-white hover:bg-brand/90"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              'Record Session'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
