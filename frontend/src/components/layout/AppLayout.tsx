import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const COLLAPSE_BELOW = 1024;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebar_collapsed');
    if (stored !== null) return stored === 'true';
    return window.innerWidth < COLLAPSE_BELOW;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  // The stored preference used to be read once on mount and then frozen, so a
  // rail expanded on a desktop monitor stayed 240px wide on a tablet. Force the
  // collapse below the breakpoint while still honouring the user's choice on
  // viewports wide enough to afford the rail.
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COLLAPSE_BELOW - 1}px)`);
    const apply = () => {
      if (mq.matches) setCollapsed(true);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    /* The sidebar is `fixed`, so it contributes no width to the flow. The old
       markup combined `flex` + a fixed aside + `ml-60`, which double-counted the
       rail and pushed the page past the viewport at every width below ~1450px.
       A single padding-left on the scroll container is the whole layout. */
    <div className="relative min-h-screen bg-bg">
      <div className="app-ambient" aria-hidden="true" />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      {/* Per-side padding on purpose: a `p-4 sm:p-6` shorthand is emitted after
          `pl-*` in Tailwind's cascade (responsive variants sort last, and both
          are single-class specificity), which silently reset the left padding
          and let the sidebar sit on top of the content. */}
      <main
        className={`relative z-10 min-w-0 py-4 pr-4 sm:py-6 sm:pr-6 transition-[padding] duration-300 ${
          collapsed ? 'pl-20 sm:pl-22' : 'pl-64'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
