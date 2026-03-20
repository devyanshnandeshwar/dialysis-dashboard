import { useState } from 'react';
import { createPatient } from '@/api/patients';
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
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Patient } from '@/types';

interface AddPatientModalProps {
  onPatientCreated: (patient: Patient) => void;
}

export default function AddPatientModal({ onPatientCreated }: AddPatientModalProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mrn: '',
    dryWeight: '',
    dateOfBirth: '',
    primaryDiagnosis: '',
    assignedUnit: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.mrn.trim() || !formData.dryWeight) {
      toast.error('Name, MRN, and Dry Weight are required');
      return;
    }

    try {
      setSubmitting(true);
      const newPatient = await createPatient({
        name: formData.name,
        mrn: formData.mrn,
        dryWeight: parseFloat(formData.dryWeight),
        dateOfBirth: formData.dateOfBirth || undefined,
        primaryDiagnosis: formData.primaryDiagnosis || undefined,
        assignedUnit: formData.assignedUnit || undefined,
      });

      onPatientCreated(newPatient);
      toast.success('Patient registered');
      setOpen(false);
      setFormData({
        name: '',
        mrn: '',
        dryWeight: '',
        dateOfBirth: '',
        primaryDiagnosis: '',
        assignedUnit: '',
      });
    } catch {
      toast.error('Failed to register patient. MRN might already exist.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    'bg-surface-alt border-border-custom text-text-primary placeholder:text-text-muted focus-visible:ring-brand';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand text-white hover:bg-brand/90 font-medium">
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-surface border-border-custom text-text-primary max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Register New Patient</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-text-muted text-xs">Full Name *</Label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Jane Doe"
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-text-muted text-xs">Medical Record Number (MRN) *</Label>
            <Input
              name="mrn"
              value={formData.mrn}
              onChange={handleChange}
              placeholder="Unique identifier"
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
                Registering...
              </>
            ) : (
              'Register Patient'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
