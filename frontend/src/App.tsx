import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import TodaySchedule from '@/pages/TodaySchedule';
import PatientsPage from '@/pages/PatientsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            border: '1px solid #d8d5e0',
            color: '#1a1a2e',
          },
        }}
      />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<TodaySchedule />} />
          <Route path="/patients" element={<PatientsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
