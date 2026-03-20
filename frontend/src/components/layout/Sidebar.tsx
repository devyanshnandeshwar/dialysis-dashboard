import { NavLink } from 'react-router-dom';
import { CalendarDays, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { to: '/', label: "Today's Schedule", icon: CalendarDays },
  { to: '/patients', label: 'Patients', icon: Users },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-surface border-r border-border-custom flex flex-col z-50">
      <div className="px-5 py-6">
        <h1 className="text-lg font-semibold text-text-primary tracking-tight">
          Dialysis Dashboard
        </h1>
      </div>

      <Separator className="bg-border-custom" />

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-surface-alt text-brand border-l-2 border-brand font-medium'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-alt/50'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-border-custom">
        <p className="text-xs text-text-muted">v1.0.0</p>
      </div>
    </aside>
  );
}
