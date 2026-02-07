import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, Settings } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { useAuth } from '@/hooks/useAuth';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/campaigns': 'Campaigns',
  '/campaigns/new': 'New Campaign',
  '/calendar': 'Calendar',
  '/posts/pending': 'Pending Approvals',
  '/posts/new': 'Create Post',
  '/integrations': 'Integrations',
  '/analytics': 'Analytics',
  '/media': 'Media Library',
  '/settings': 'Settings',
  '/upload-process': 'Upload & Process',
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (routeTitles[pathname]) return routeTitles[pathname];

  // Dynamic routes
  if (/^\/campaigns\/[^/]+$/.test(pathname)) return 'Campaign Detail';
  if (/^\/posts\/[^/]+$/.test(pathname) && pathname !== '/posts/pending' && pathname !== '/posts/new')
    return 'Post Detail';

  // Fallback: capitalize last segment
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    return segments[segments.length - 1]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return 'Dashboard';
}

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, organization, logout } = useAuth();

  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{pageTitle}</h1>
        {organization && (
          <p className="text-xs text-text-muted">{organization.name}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button className="relative rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-status-pending" />
        </button>

        {/* User menu */}
        <DropdownMenu
          trigger={
            <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-tertiary">
              <Avatar
                src={user?.avatar}
                name={user?.name || 'User'}
                size="sm"
              />
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-text-primary">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-text-muted">{user?.email}</p>
              </div>
            </div>
          }
          items={[
            {
              id: 'profile',
              label: 'Profile',
              icon: <User className="h-4 w-4" />,
              onClick: () => navigate('/settings'),
            },
            {
              id: 'settings',
              label: 'Settings',
              icon: <Settings className="h-4 w-4" />,
              onClick: () => navigate('/settings'),
            },
            {
              id: 'logout',
              label: 'Sign Out',
              icon: <LogOut className="h-4 w-4" />,
              danger: true,
              onClick: handleLogout,
            },
          ]}
        />
      </div>
    </header>
  );
}
