import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main 
        className={`flex-1 p-6 transition-all duration-300 ${
          collapsed ? 'ml-[68px]' : 'ml-60'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
