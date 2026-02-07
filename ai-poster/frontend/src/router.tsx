import React from 'react';
import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
} from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';

// App pages
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { CampaignsPage } from '@/pages/campaigns/CampaignsPage';
import { NewCampaignPage } from '@/pages/campaigns/NewCampaignPage';
import { CampaignDetailPage } from '@/pages/campaigns/CampaignDetailPage';
import { CalendarPage } from '@/pages/calendar/CalendarPage';
import { PendingApprovalsPage } from '@/pages/posts/PendingApprovalsPage';
import { NewPostPage } from '@/pages/posts/NewPostPage';
import { PostDetailPage } from '@/pages/posts/PostDetailPage';
import { IntegrationsPage } from '@/pages/integrations/IntegrationsPage';
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage';
import { MediaPage } from '@/pages/media/MediaPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { UploadProcessPage } from '@/pages/upload-process/UploadProcessPage';

const routes: RouteObject[] = [
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  // Redirect root to dashboard
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  // Protected app routes
  {
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/campaigns',
        element: <CampaignsPage />,
      },
      {
        path: '/campaigns/new',
        element: <NewCampaignPage />,
      },
      {
        path: '/campaigns/:id',
        element: <CampaignDetailPage />,
      },
      {
        path: '/calendar',
        element: <CalendarPage />,
      },
      {
        path: '/posts/pending',
        element: <PendingApprovalsPage />,
      },
      {
        path: '/posts/new',
        element: <NewPostPage />,
      },
      {
        path: '/posts/:id',
        element: <PostDetailPage />,
      },
      {
        path: '/integrations',
        element: <IntegrationsPage />,
      },
      {
        path: '/analytics',
        element: <AnalyticsPage />,
      },
      {
        path: '/media',
        element: <MediaPage />,
      },
      {
        path: '/settings',
        element: <SettingsPage />,
      },
      {
        path: '/upload-process',
        element: <UploadProcessPage />,
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
