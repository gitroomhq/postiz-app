import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Megaphone,
  CalendarDays,
  Clock,
  PenSquare,
  Plug2,
  BarChart3,
  Image,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Campaigns',
    href: '/campaigns',
    icon: <Megaphone className="h-5 w-5" />,
  },
  {
    label: 'Calendar',
    href: '/calendar',
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    label: 'Posts',
    href: '/posts',
    icon: <PenSquare className="h-5 w-5" />,
    children: [
      { label: 'Pending Approvals', href: '/posts/pending' },
      { label: 'Create New', href: '/posts/new' },
    ],
  },
  {
    label: 'Integrations',
    href: '/integrations',
    icon: <Plug2 className="h-5 w-5" />,
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    label: 'Media',
    href: '/media',
    icon: <Image className="h-5 w-5" />,
  },
  {
    label: 'Upload & Process',
    href: '/upload-process',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />,
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Posts']);
  const location = useLocation();

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === '/posts') return location.pathname.startsWith('/posts');
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-gray-100 bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-50 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-text-primary">AI Poster</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            if (item.children) {
              const groupExpanded = expandedGroups.includes(item.label);
              const groupActive = isActive(item.href);

              return (
                <li key={item.label}>
                  <button
                    onClick={() => !collapsed && toggleGroup(item.label)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      groupActive
                        ? 'text-brand-600'
                        : 'text-text-muted hover:bg-surface-tertiary hover:text-text-primary'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform',
                            groupExpanded && 'rotate-180'
                          )}
                        />
                      </>
                    )}
                  </button>
                  {!collapsed && groupExpanded && (
                    <ul className="ml-5 mt-1 space-y-0.5 border-l border-gray-100 pl-4">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <NavLink
                            to={child.href}
                            className={({ isActive: active }) =>
                              cn(
                                'block rounded-md px-3 py-2 text-sm transition-colors',
                                active
                                  ? 'bg-brand-50 font-medium text-brand-600'
                                  : 'text-text-muted hover:bg-surface-tertiary hover:text-text-primary'
                              )
                            }
                          >
                            {child.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            return (
              <li key={item.label}>
                <NavLink
                  to={item.href}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive: active }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-brand-50 text-brand-600'
                        : 'text-text-muted hover:bg-surface-tertiary hover:text-text-primary'
                    )
                  }
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-gray-50 px-3 py-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
