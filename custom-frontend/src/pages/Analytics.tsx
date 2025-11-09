import { DashboardLayout } from '@/components/DashboardLayout';
import { BarChart3 } from 'lucide-react';

export function Analytics() {
  return (
    <DashboardLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
          <p className="text-gray-600">Track your social media performance</p>
        </div>

        <div className="card text-center py-12">
          <BarChart3 className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 mb-2">Analytics coming soon</p>
          <p className="text-sm text-gray-500">
            This feature will show detailed analytics for your posts and integrations
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
