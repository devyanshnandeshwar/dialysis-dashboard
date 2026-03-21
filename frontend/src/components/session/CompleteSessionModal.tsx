import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { completeSession } from '@/api/sessions';
import { getMachines } from '@/api/machines';
import type { DialysisSession, Patient } from '@/types';

interface CompleteSessionModalProps {
    session: DialysisSession;
    onCompleted: () => Promise<void> | void;
}

export default function CompleteSessionModal({
    session,
    onCompleted,
}: CompleteSessionModalProps) {
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const patient = session.patientId as Patient;

    const [postWeight, setPostWeight] = useState('');
    const [postBpSystolic, setPostBpSystolic] = useState('');
    const [postBpDiastolic, setPostBpDiastolic] = useState('');
    const [sessionDurationMinutes, setSessionDurationMinutes] = useState('');
    const [nurseNotes, setNurseNotes] = useState('');

    const resetForm = () => {
        setPostWeight('');
        setPostBpSystolic('');
        setPostBpDiastolic('');
        setSessionDurationMinutes('');
        setNurseNotes('');
        setErrors({});
    };

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (!nextOpen) {
            resetForm();
        }
    };

    const fieldClass =
        'bg-bg border-border text-text-primary text-sm placeholder:text-text-muted focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent-glow h-9';

    const validate = () => {
        const nextErrors: Record<string, string> = {};

        if (!postWeight || Number(postWeight) <= 0) {
            nextErrors.postWeight = 'Post-session weight is required';
        }
        if (!postBpSystolic || Number(postBpSystolic) <= 0) {
            nextErrors.postBpSystolic = 'Systolic BP is required';
        }
        if (!postBpDiastolic || Number(postBpDiastolic) <= 0) {
            nextErrors.postBpDiastolic = 'Diastolic BP is required';
        }
        if (!sessionDurationMinutes || Number(sessionDurationMinutes) <= 0) {
            nextErrors.sessionDurationMinutes = 'Actual duration is required';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        try {
            setSubmitting(true);
            const updated = await completeSession(session._id, {
                postWeight: Number(postWeight),
                postBloodPressure: {
                    systolic: Number(postBpSystolic),
                    diastolic: Number(postBpDiastolic),
                },
                sessionDurationMinutes: Number(sessionDurationMinutes),
                nurseNotes: nurseNotes.trim() || undefined,
            });

            if (updated.anomalies.length > 0) {
                toast.error(`${updated.anomalies.length} anomalies detected`);
                updated.anomalies.forEach((anomaly) => toast.error(anomaly.message));
            } else {
                toast.success('Session completed — no anomalies');
            }

            await getMachines();
            resetForm();
            setOpen(false);
            await onCompleted();
        } catch {
            toast.error('Failed to complete session');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-accent text-white hover:brightness-110 w-full h-10 px-4 rounded-lg shadow-sm whitespace-nowrap">
                    <span className="hidden sm:inline">Complete Session</span>
                    <span className="sm:hidden">Complete</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="bg-surface border-border shadow-2xl text-text-primary max-w-lg max-h-[85vh] overflow-y-auto p-0">
                <DialogHeader className="px-6 py-4 border-b border-border-subtle bg-surface-alt/40">
                    <DialogTitle className="text-text-primary text-lg font-bold">
                        Complete Session — {patient.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 px-6 py-4">
                    <div className="rounded-lg border border-border-subtle bg-surface-alt/30 p-3 text-sm space-y-1.5">
                        <p className="text-text-secondary">Pre-weight: <span className="text-text-primary font-medium">{session.preWeight ?? '—'} kg</span></p>
                        <p className="text-text-secondary">Pre-BP: <span className="text-text-primary font-medium">{session.preBloodPressure ? `${session.preBloodPressure.systolic}/${session.preBloodPressure.diastolic}` : '—'} mmHg</span></p>
                        <p className="text-text-secondary">Target Duration: <span className="text-text-primary font-medium">{session.targetDurationMinutes} min</span></p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Post-Session Weight (kg)</Label>
                        <Input
                            type="number"
                            step="0.1"
                            value={postWeight}
                            onChange={(e) => setPostWeight(e.target.value)}
                            className={fieldClass}
                        />
                        {errors.postWeight && <p className="text-xs text-critical">{errors.postWeight}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Post-BP Systolic</Label>
                        <Input
                            type="number"
                            value={postBpSystolic}
                            onChange={(e) => setPostBpSystolic(e.target.value)}
                            className={fieldClass}
                        />
                        {errors.postBpSystolic && <p className="text-xs text-critical">{errors.postBpSystolic}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Post-BP Diastolic</Label>
                        <Input
                            type="number"
                            value={postBpDiastolic}
                            onChange={(e) => setPostBpDiastolic(e.target.value)}
                            className={fieldClass}
                        />
                        {errors.postBpDiastolic && <p className="text-xs text-critical">{errors.postBpDiastolic}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Actual Duration (min)</Label>
                        <Input
                            type="number"
                            value={sessionDurationMinutes}
                            onChange={(e) => setSessionDurationMinutes(e.target.value)}
                            placeholder={`Target was ${session.targetDurationMinutes} min`}
                            className={fieldClass}
                        />
                        {errors.sessionDurationMinutes && <p className="text-xs text-critical">{errors.sessionDurationMinutes}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] tracking-widest text-text-muted uppercase font-bold">Nurse Notes</Label>
                        <Textarea
                            value={nurseNotes}
                            onChange={(e) => setNurseNotes(e.target.value)}
                            placeholder="Optional notes"
                            rows={3}
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
                                Completing...
                            </>
                        ) : (
                            'Complete Session'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
