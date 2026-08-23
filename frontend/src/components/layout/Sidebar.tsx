import { NavLink } from 'react-router-dom';
import { CalendarDays, Users, PanelLeftClose, PanelLeftOpen, Moon, Sun, LogOut } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ROLE_BLURBS, ROLE_LABELS } from '@/lib/permissions';

const navItems = [
  { to: '/app', label: "Today's Schedule", icon: CalendarDays, end: true },
  { to: '/app/patients', label: 'Patients', icon: Users, end: false },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  // Label and accessible name must describe the same thing. An earlier version
  // showed the current state ("Dark") while announcing the action ("Switch to
  // light mode"), so sighted and screen-reader users got opposite messages.
  const nextTheme = theme === 'dark' ? 'Light' : 'Dark';
  const toggleThemeLabel = `Switch to ${nextTheme.toLowerCase()} mode`;
  const railLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar';

  return (
    <aside
      className={`glass fixed left-0 top-0 h-screen flex flex-col z-50 rounded-r-2xl border-l-0 border-y-0 transition-[width] duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand + the rail's own control. The expand/collapse toggle belongs
          with the rail it controls, not grouped with the account actions at
          the bottom -- and moving it here is what frees the footer. */}
      <div
        className={`flex items-center gap-2 py-4 ${collapsed ? 'flex-col px-0' : 'px-4'}`}
      >
        {collapsed ? (
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent-solid font-bold text-accent-on-solid">
            D
          </div>
        ) : (
          <h1 className="min-w-0 flex-1 truncate text-lg tracking-tight">
            <span className="font-bold text-text-primary">Dialysis</span>
            <span className="ml-1.5 font-medium text-text-muted">Dashboard</span>
          </h1>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={railLabel}
          title={railLabel}
          className="shrink-0 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        >
          {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
        </Button>
      </div>

      <Separator className="bg-border-subtle" />

      <nav className="flex-1 space-y-1 overflow-hidden px-2.5 py-5">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl py-2.5 text-sm transition-colors duration-200 ${
                collapsed ? 'justify-center px-0' : 'px-3'
              } ${
                isActive
                  ? 'bg-accent-solid font-medium text-accent-on-solid'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`
            }
          >
            <Icon className="size-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Account controls. Stacked when collapsed: two 36px buttons plus a gap
          do not fit across a 64px rail, which previously pushed the theme
          toggle past the sidebar edge. */}
      <div className="border-t border-border-subtle p-2.5">
        {user && !collapsed && (
          <div className="mb-2 px-1">
            <p className="truncate text-[11px] text-text-muted" title={user.email}>
              {user.email}
            </p>
            {/* What this account can do is otherwise only discoverable by
                noticing which buttons are missing. */}
            <p className="mt-1 inline-flex items-center rounded border border-border bg-surface-alt px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
              {ROLE_LABELS[user.role] ?? user.role}
            </p>
            <p className="mt-1 text-[10px] text-text-muted">{ROLE_BLURBS[user.role] ?? ''}</p>
          </div>
        )}

        {user && collapsed && (
          <p
            className="mb-2 text-center text-[9px] font-semibold uppercase tracking-wider text-text-muted"
            title={`${ROLE_LABELS[user.role] ?? user.role} -- ${user.email}`}
          >
            {(ROLE_LABELS[user.role] ?? user.role).slice(0, 3)}
          </p>
        )}

        <div className={`flex gap-1 ${collapsed ? 'flex-col items-center' : 'items-center'}`}>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={toggleTheme}
            aria-label={toggleThemeLabel}
            title={toggleThemeLabel}
            className={`${collapsed ? '' : 'flex-1 justify-start px-2'} text-text-secondary hover:bg-surface-hover hover:text-text-primary`}
          >
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
            {!collapsed && <span>{nextTheme}</span>}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="shrink-0 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
