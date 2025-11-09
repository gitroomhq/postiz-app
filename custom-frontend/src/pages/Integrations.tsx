import { DashboardLayout } from '@/components/DashboardLayout';
import { useIntegrations } from '@/hooks/useIntegrations';
import { Trash2, Share2 } from 'lucide-react';

export function Integrations() {
  const { integrations, loading, error, deleteIntegration } = useIntegrations();

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this integration?')) return;

    try {
      await deleteIntegration(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <DashboardLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
            <p className="text-gray-600">Manage your social media connections</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">Loading integrations...</p>
          </div>
        ) : integrations.length === 0 ? (
          <div className="card text-center py-12">
            <Share2 className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 mb-4">No integrations connected yet.</p>
            <p className="text-sm text-gray-500">
              Connect your social media accounts to start posting
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => (
              <div key={integration.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {integration.picture ? (
                      <img
                        src={integration.picture}
                        alt={integration.name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                        {integration.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                      <p className="text-sm text-gray-500">{integration.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(integration.id)}
                    className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  <p>@{integration.providerIdentifier}</p>
                  {integration.disabled && (
                    <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                      Disabled
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
