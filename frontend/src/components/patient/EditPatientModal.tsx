import { useState } from 'react';
import { updatePatient } from '@/api/patients';
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
import { Pencil, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { Patient } from '@/types';

interface EditPatientModalProps {
  patient: Patient;
  onPatientUpdated: (updatedPatient: Patient) => void;
}

export default function EditPatientModal({ patient, onPatientUpdated }: EditPatientModalProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: patient.name,
    dryWeight: patient.dryWeight.toString(),
    dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
    primaryDiagnosis: patient.primaryDiagnosis || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.dryWeight) {
      toast.error('Name and Dry Weight are required');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await updatePatient(patient._id, {
        name: formData.name,
        dryWeight: parseFloat(formData.dryWeight),
        dateOfBirth: formData.dateOfBirth || undefined,
        primaryDiagnosis: formData.primaryDiagnosis || undefined,
      });

      onPatientUpdated(updated);
      toast.success('Patient updated');
      setOpen(false);
    } catch {
      toast.error('Failed to update patient');
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
          variant="ghost"
          aria-label="Edit patient"
          className="h-8 w-8 p-0 border border-transparent text-text-muted/80 hover:text-accent hover:bg-accent-glow hover:border-accent/30 transition-all rounded-md"
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-surface border-border shadow-2xl text-text-primary max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border-subtle bg-surface-alt/40">
          <DialogTitle className="text-text-primary text-lg font-bold">Edit Patient</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">MRN (Read-only)</Label>
            <div className="flex items-center gap-2 px-3 h-9 bg-bg border border-border rounded-md text-text-muted text-sm cursor-not-allowed opacity-70">
              <Lock className="w-3.5 h-3.5" />
              {patient.mrn}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Name *</Label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Full name"
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Dry Weight (kg) *</Label>
            <Input
              name="dryWeight"
              type="number"
              step="0.1"
              value={formData.dryWeight}
              onChange={handleChange}
              placeholder="e.g. 70.5"
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Date of Birth</Label>
            <Input
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Primary Diagnosis</Label>
            <Input
              name="primaryDiagnosis"
              value={formData.primaryDiagnosis}
              onChange={handleChange}
              placeholder="e.g. Chronic Kidney Disease Stage 5"
              className={fieldClass}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-accent text-white hover:brightness-110 shadow-md font-semibold text-sm mt-2 mb-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
