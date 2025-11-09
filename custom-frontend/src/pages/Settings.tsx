import { DashboardLayout } from '@/components/DashboardLayout';
import { Settings as SettingsIcon } from 'lucide-react';

export function Settings() {
  return (
    <DashboardLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account settings</p>
        </div>

        <div className="card text-center py-12">
          <SettingsIcon className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 mb-2">Settings coming soon</p>
          <p className="text-sm text-gray-500">
            This section will allow you to customize your account preferences
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
