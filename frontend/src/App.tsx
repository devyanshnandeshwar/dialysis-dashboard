import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import TodaySchedule from '@/pages/TodaySchedule';
import PatientsPage from '@/pages/PatientsPage';
import { ThemeProvider } from '@/context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
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
    </ThemeProvider>
  );
}
