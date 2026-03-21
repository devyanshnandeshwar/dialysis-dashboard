
import { NavLink } from 'react-router-dom';
import { CalendarDays, Users, PanelLeftClose, PanelLeftOpen, Moon, Sun } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/ThemeContext';

const navItems = [
  { to: '/', label: "Today's Schedule", icon: CalendarDays },
  { to: '/patients', label: 'Patients', icon: Users },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-surface border-r border-border-subtle flex flex-col z-50 transition-all duration-300 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] ${collapsed ? 'w-17' : 'w-60'
        }`}
    >
      {/* Subtle top gradient */}
      <div
        className="absolute top-0 left-0 w-full h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, var(--color-surface-alt), transparent)' }}
      />

      <div className={`py-6 flex items-center relative z-10 ${collapsed ? 'px-0 justify-center' : 'px-6'}`}>
        {!collapsed ? (
          <h1 className="text-xl tracking-tight whitespace-nowrap overflow-hidden">
            <span className="text-text-primary font-bold">Dialysis</span>
            <span className="text-accent font-medium ml-1.5">Dashboard</span>
          </h1>
        ) : (
          <div className="w-10 h-10 rounded-xl border border-accent/30 bg-accent/10 flex items-center justify-center text-accent font-bold shrink-0 shadow-xs">
            D
          </div>
        )}
      </div>

      <Separator className="bg-border-subtle relative z-10" />

      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-hidden relative z-10">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${collapsed ? 'px-0 justify-center' : 'px-3.5'
              } ${isActive
                ? 'bg-accent text-white shadow-md shadow-accent/20 font-medium translate-x-1'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover hover:translate-x-1'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border-subtle flex items-center justify-between relative z-10">
        {!collapsed && <p className="text-xs text-text-secondary px-2">v1.0.0</p>}
        <div className={`flex items-center ${collapsed ? 'w-full justify-center gap-1' : 'gap-1 ml-auto'}`}>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`${collapsed ? '' : 'px-2'} text-text-secondary hover:text-text-primary hover:bg-surface`}
          >
            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            {!collapsed && <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="text-text-secondary hover:text-text-primary hover:bg-surface"
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </aside>
  );
}
