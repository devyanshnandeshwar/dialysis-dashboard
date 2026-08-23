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
    gender: '',
    phoneNumber: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
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
        gender: formData.gender ? formData.gender as Patient['gender'] : undefined,
        phoneNumber: formData.phoneNumber || undefined,
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
        gender: '',
        phoneNumber: '',
      });
    } catch {
      toast.error('Failed to register patient. MRN might already exist.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    'bg-bg border-border text-text-primary text-sm placeholder:text-text-muted focus-visible:border-accent-edge h-9';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent-solid text-accent-on-solid hover:brightness-90 shadow-sm font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </DialogTrigger>

      <DialogContent className="text-text-primary max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border-subtle bg-surface-alt/40">
          <DialogTitle className="text-text-primary text-lg font-bold">Register New Patient</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4 overflow-y-auto max-h-[75vh]">
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Full Name *</Label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Nora Ibrahim"
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Medical Record Number (MRN) *</Label>
            <Input
              name="mrn"
              value={formData.mrn}
              onChange={handleChange}
              placeholder="Unique identifier"
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

          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Gender</Label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={`${fieldClass} w-full rounded-md px-3 font-normal`}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Phone Number</Label>
            <Input
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="e.g. +1 234 567 8900"
              className={fieldClass}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-accent-solid text-accent-on-solid hover:brightness-90 shadow-md font-semibold text-sm mt-2 mb-2"
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
