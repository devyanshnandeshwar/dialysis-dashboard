
import { NavLink } from 'react-router-dom';
import { CalendarDays, Users, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/', label: "Today's Schedule", icon: CalendarDays },
  { to: '/patients', label: 'Patients', icon: Users },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-surface border-r border-border-custom flex flex-col z-50 transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      <div className={`py-6 flex items-center ${collapsed ? 'px-0 justify-center' : 'px-5'}`}>
        {!collapsed ? (
          <h1 className="text-lg font-semibold text-text-primary tracking-tight whitespace-nowrap overflow-hidden">
            Dialysis Dashboard
          </h1>
        ) : (
          <div className="w-8 h-8 rounded-full border-2 border-brand flex items-center justify-center text-brand font-bold shrink-0">
            D
          </div>
        )}
      </div>

      <Separator className="bg-border-custom" />

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-hidden">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2.5 rounded-lg text-sm transition-colors ${
                collapsed ? 'px-0 justify-center' : 'px-3'
              } ${
                isActive
                  ? 'bg-surface-alt text-brand border-l-2 border-brand font-medium'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-alt/50 border-l-2 border-transparent'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border-custom flex items-center justify-between">
        {!collapsed && <p className="text-xs text-text-muted px-2">v1.0.0</p>}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggle}
          className={`${collapsed ? 'mx-auto' : ''} text-text-muted hover:text-text-primary hover:bg-surface-alt`}
        >
          {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </Button>
      </div>
    </aside>
  );
}
