'use client';

import { FC, useState, useEffect, useCallback, useContext } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { IntegrationContext } from '@gitroom/frontend/components/launches/helpers/use.integration';
import clsx from 'clsx';

interface ThemeSettings {
  key: string;
  type: 'select' | 'boolean' | 'color' | 'text' | 'number';
  value: string | boolean | number;
  options?: string[];
  default?: string | boolean | number;
  group?: string;
  description?: string;
}

interface ThemeInfo {
  value: string;
  label: string;
  active?: boolean;
}

/**
 * Ghost Theme Settings Component
 * Allows viewing/activating themes and customizing theme settings
 * Uses the integration's tool methods for themes, themeSettings, updateThemeSettings, activateTheme
 */
export const GhostThemeSettings: FC<{
  integrationId: string;
}> = ({ integrationId }) => {
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [settings, setSettings] = useState<ThemeSettings[]>([]);
  const [activeTheme, setActiveTheme] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useFetch();
  const { integration } = useContext(IntegrationContext);

  // Fetch themes on mount
  const loadThemes = useCallback(async () => {
    if (!integrationId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Call the 'themes' method on the Ghost provider
      const res = await fetch('/integrations/function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: integrationId,
          name: 'themes',
          data: {},
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to load themes');
      }

      const themesData = await res.json();
      setThemes(themesData || []);
      
      // Find active theme
      const active = themesData.find((t: ThemeInfo) => t.active);
      if (active) {
        setActiveTheme(active.value);
        
        // Load theme settings
        const settingsRes = await fetch('/integrations/function', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: integrationId,
            name: 'themeSettings',
            data: {},
          }),
        });

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData || []);
        }
      }
    } catch (err: any) {
      console.error('Failed to load theme data:', err);
      setError(err?.message || 'Failed to load themes');
    } finally {
      setLoading(false);
    }
  }, [integrationId, fetch]);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  // Activate theme
  const handleActivateTheme = async (themeName: string) => {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch('/integrations/function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: integrationId,
          name: 'activateTheme',
          data: { themeName },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to activate theme');
      }

      // Update active theme
      setActiveTheme(themeName);
      setThemes(prev =>
        prev.map(t => ({ ...t, active: t.value === themeName || t.label === themeName }))
      );

      // Reload theme settings
      const settingsRes = await fetch('/integrations/function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: integrationId,
          name: 'themeSettings',
          data: {},
        }),
      });

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData || []);
      }
    } catch (err: any) {
      console.error('Failed to activate theme:', err);
      setError(err?.message || 'Failed to activate theme');
    } finally {
      setSaving(false);
    }
  };

  // Update theme setting
  const handleSettingChange = async (key: string, value: string | boolean | number) => {
    try {
      setSaving(true);
      setError(null);

      // Optimistically update local state
      setSettings(prev =>
        prev.map(s => s.key === key ? { ...s, value } : s)
      );

      // Update all settings (Ghost API requires full update)
      const updatedSettings = settings.map(s =>
        s.key === key ? { key: s.key, value } : { key: s.key, value: s.value }
      );

      const res = await fetch('/integrations/function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: integrationId,
          name: 'updateThemeSettings',
          data: { settings: updatedSettings },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update setting');
      }
    } catch (err: any) {
      console.error('Failed to update setting:', err);
      setError(err?.message || 'Failed to update setting');

      // Revert on error by reloading settings
      loadThemes();
    } finally {
      setSaving(false);
    }
  };

  // Group settings by group name
  const groupedSettings = settings.reduce((acc, setting) => {
    const group = setting.group || 'General';
    if (!acc[group]) acc[group] = [];
    acc[group].push(setting);
    return acc;
  }, {} as Record<string, ThemeSettings[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-[20px]">
        <div className="text-[14px] text-customColor26">Loading theme settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-[12px] bg-red-500/10 rounded-[8px]">
        <div className="text-[14px] text-red-400">{error}</div>
        <button
          onClick={loadThemes}
          className="mt-[8px] text-[12px] text-red-300 hover:text-red-200 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[16px]">
      {/* Theme Selector */}
      <div className="flex flex-col gap-[8px]">
        <label className="text-[14px] font-semibold text-white">Active Theme</label>
        <div className="flex flex-wrap gap-[8px]">
          {themes.map((theme) => {
            const isActive = theme.active || theme.value === activeTheme || theme.label === activeTheme;
            return (
              <button
                key={theme.value}
                onClick={() => !isActive && handleActivateTheme(theme.value)}
                disabled={saving || isActive}
                className={clsx(
                  'px-[12px] py-[8px] rounded-[8px] text-[13px] font-medium transition-all',
                  isActive
                    ? 'bg-customColor text-white border border-customColor'
                    : 'bg-third text-white/80 border border-fifth hover:border-customColor hover:bg-customColor/20',
                  saving && 'opacity-50 cursor-not-allowed'
                )}
              >
                {theme.label}
                {isActive && ' ✓'}
              </button>
            );
          })}
        </div>
        {saving && (
          <div className="text-[12px] text-customColor26">Saving...</div>
        )}
      </div>

      {/* Theme Settings by Group */}
      {Object.keys(groupedSettings).length > 0 && (
        <div className="flex flex-col gap-[16px]">
          <div className="text-[14px] font-semibold text-white">Theme Settings</div>

          {Object.entries(groupedSettings).map(([groupName, groupSettings]) => (
            <div key={groupName} className="flex flex-col gap-[12px]">
              {groupName !== 'General' && (
                <div className="text-[12px] uppercase tracking-[0.5px] text-customColor26 font-medium">
                  {groupName}
                </div>
              )}

              {groupSettings.map((setting) => (
                <div key={setting.key} className="flex flex-col gap-[4px]">
                  <label className="text-[13px] text-white/90">
                    {setting.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </label>

                  {setting.description && (
                    <div className="text-[11px] text-customColor26">{setting.description}</div>
                  )}

                  {/* Render appropriate input based on type */}
                  {setting.type === 'boolean' && (
                    <label className="flex items-center gap-[8px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={String(setting.value) === 'true' || setting.value === true}
                        onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                        disabled={saving}
                        className="w-[16px] h-[16px] rounded-[4px] border-2 border-fifth bg-third accent-customColor"
                      />
                      <span className="text-[13px] text-white/70">
                        {setting.value ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  )}

                  {setting.type === 'select' && (
                    <select
                      value={String(setting.value)}
                      onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                      disabled={saving}
                      className="bg-third border border-fifth rounded-[6px] px-[12px] py-[8px] text-[14px] text-white outline-none focus:border-customColor"
                    >
                      {setting.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {setting.type === 'color' && (
                    <div className="flex items-center gap-[8px]">
                      <input
                        type="color"
                        value={String(setting.value)}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        disabled={saving}
                        className="w-[40px] h-[40px] rounded-[6px] border border-fifth bg-third cursor-pointer"
                      />
                      <input
                        type="text"
                        value={String(setting.value)}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        disabled={saving}
                        className="flex-1 bg-third border border-fifth rounded-[6px] px-[12px] py-[8px] text-[14px] text-white outline-none focus:border-customColor"
                        placeholder="#000000"
                      />
                    </div>
                  )}

                  {setting.type === 'text' && (
                    <input
                      type="text"
                      value={String(setting.value)}
                      onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                      disabled={saving}
                      className="bg-third border border-fifth rounded-[6px] px-[12px] py-[8px] text-[14px] text-white outline-none focus:border-customColor"
                    />
                  )}

                  {setting.type === 'number' && (
                    <input
                      type="number"
                      value={Number(setting.value)}
                      onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                      disabled={saving}
                      className="bg-third border border-fifth rounded-[6px] px-[12px] py-[8px] text-[14px] text-white outline-none focus:border-customColor"
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {themes.length === 0 && !loading && (
        <div className="text-[14px] text-customColor26">
          No themes found. Upload a theme in Ghost Admin first.
        </div>
      )}
    </div>
  );
};

export default GhostThemeSettings;
