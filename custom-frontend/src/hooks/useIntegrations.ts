import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { Integration } from '@/types';

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getIntegrations();
      setIntegrations(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch integrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const deleteIntegration = async (id: string) => {
    try {
      await apiClient.deleteIntegration(id);
      setIntegrations((prev) => prev.filter((int) => int.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete integration');
    }
  };

  return {
    integrations,
    loading,
    error,
    fetchIntegrations,
    deleteIntegration,
  };
}
