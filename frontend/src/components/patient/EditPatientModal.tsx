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
    assignedUnit: patient.assignedUnit || '',
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
        assignedUnit: formData.assignedUnit || undefined,
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
    'bg-surface-alt border-border-custom text-text-primary placeholder:text-text-muted focus-visible:ring-brand';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-text-muted hover:text-brand hover:bg-surface-alt opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-surface border-border-custom text-text-primary max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Edit Patient</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-text-muted text-xs">MRN (Read-only)</Label>
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-alt/50 border border-border-custom rounded-md text-text-muted text-sm">
              <Lock className="w-3.5 h-3.5" />
              {patient.mrn}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-text-muted text-xs">Name *</Label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Full name"
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-text-muted text-xs">Dry Weight (kg) *</Label>
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
            <Label className="text-text-muted text-xs">Date of Birth</Label>
            <Input
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-text-muted text-xs">Primary Diagnosis</Label>
            <Input
              name="primaryDiagnosis"
              value={formData.primaryDiagnosis}
              onChange={handleChange}
              placeholder="e.g. Chronic Kidney Disease Stage 5"
              className={fieldClass}
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-text-muted text-xs">Assigned Unit</Label>
            <Input
              name="assignedUnit"
              value={formData.assignedUnit}
              onChange={handleChange}
              placeholder="e.g. Unit A"
              className={fieldClass}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-brand text-white hover:bg-brand/90 mt-4"
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
