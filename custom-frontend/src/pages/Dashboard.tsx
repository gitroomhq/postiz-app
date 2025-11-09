import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

export function Dashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-8">
          Welcome back, {user?.username || user?.email}!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Posts</h3>
            <p className="text-3xl font-bold text-gray-900">0</p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Scheduled</h3>
            <p className="text-3xl font-bold text-blue-600">0</p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Published</h3>
            <p className="text-3xl font-bold text-green-600">0</p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Integrations</h3>
            <p className="text-3xl font-bold text-purple-600">0</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Getting Started</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Connect your social accounts</h3>
                <p className="text-sm text-gray-600">
                  Go to Integrations to connect your social media accounts
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Create your first post</h3>
                <p className="text-sm text-gray-600">
                  Navigate to Posts to create and schedule your content
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Track your analytics</h3>
                <p className="text-sm text-gray-600">
                  Monitor your performance in the Analytics section
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
