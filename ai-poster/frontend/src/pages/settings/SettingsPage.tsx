import React, { useState } from 'react';
import {
  User,
  Users,
  Settings2,
  Save,
  Trash2,
  Plus,
  Shield,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  { id: 'team', label: 'Team', icon: <Users className="h-4 w-4" /> },
  { id: 'defaults', label: 'Defaults', icon: <Settings2 className="h-4 w-4" /> },
];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  avatar?: string;
}

export function SettingsPage() {
  const { user, organization } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [saving, setSaving] = useState(false);

  // Team state
  const [teamMembers] = useState<TeamMember[]>([]);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');

  // Defaults state
  const [defaultTimezone, setDefaultTimezone] = useState('UTC');
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [autoApprove, setAutoApprove] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await fetchApi('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, timezone }),
      });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    try {
      await fetchApi('/team/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      toast.success('Invitation sent');
      setInviteModal(false);
      setInviteEmail('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite');
    }
  };

  const handleSaveDefaults = async () => {
    setSaving(true);
    try {
      await fetchApi('/settings/defaults', {
        method: 'PUT',
        body: JSON.stringify({
          timezone: defaultTimezone,
          language: defaultLanguage,
          autoApprove,
        }),
      });
      toast.success('Defaults saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save defaults');
    } finally {
      setSaving(false);
    }
  };

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (US)' },
    { value: 'America/Chicago', label: 'Central Time (US)' },
    { value: 'America/Denver', label: 'Mountain Time (US)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Central European Time' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Shanghai', label: 'Shanghai' },
    { value: 'Australia/Sydney', label: 'Sydney' },
  ];

  return (
    <div className="page-container max-w-3xl space-y-6">
      <div>
        <h2 className="section-title">Settings</h2>
        <p className="subtle-text mt-1">
          Manage your profile, team, and preferences.
        </p>
      </div>

      <Tabs items={settingsTabs} activeId={activeTab} onChange={setActiveTab} />

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>Profile Information</CardHeader>
          <CardBody className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar src={user?.avatar} name={user?.name || 'User'} size="lg" />
              <div>
                <p className="font-medium text-text-primary">{user?.name}</p>
                <p className="text-sm text-text-muted">{user?.email}</p>
              </div>
            </div>

            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              disabled
              hint="Email cannot be changed"
            />
            <Select
              label="Timezone"
              options={timezoneOptions}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />

            <div className="flex justify-end">
              <Button
                icon={<Save className="h-4 w-4" />}
                onClick={handleSaveProfile}
                loading={saving}
              >
                Save Changes
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="space-y-5">
          <Card>
            <CardHeader
              action={
                <Button
                  size="sm"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => setInviteModal(true)}
                >
                  Invite Member
                </Button>
              }
            >
              Team Members
            </CardHeader>
            <CardBody>
              {/* Current user always shown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-gray-50 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={user?.avatar}
                      name={user?.name || 'User'}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {user?.name} <span className="text-text-muted">(you)</span>
                      </p>
                      <p className="text-xs text-text-muted">{user?.email}</p>
                    </div>
                  </div>
                  <Badge variant="approved">
                    <Shield className="mr-1 h-3 w-3" />
                    Admin
                  </Badge>
                </div>

                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-gray-50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={member.avatar}
                        name={member.name}
                        size="sm"
                      />
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {member.name}
                        </p>
                        <p className="text-xs text-text-muted">{member.email}</p>
                      </div>
                    </div>
                    <Badge variant={member.role === 'ADMIN' ? 'approved' : 'default'}>
                      {member.role}
                    </Badge>
                  </div>
                ))}

                {teamMembers.length === 0 && (
                  <p className="py-4 text-center text-sm text-text-muted">
                    No additional team members. Invite someone to get started.
                  </p>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Invite Modal */}
          <Modal
            open={inviteModal}
            onClose={() => setInviteModal(false)}
            title="Invite Team Member"
            footer={
              <>
                <Button variant="outline" onClick={() => setInviteModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={!inviteEmail}>
                  Send Invitation
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Select
                label="Role"
                options={[
                  { value: 'MEMBER', label: 'Member' },
                  { value: 'ADMIN', label: 'Admin' },
                ]}
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              />
            </div>
          </Modal>
        </div>
      )}

      {/* Defaults Tab */}
      {activeTab === 'defaults' && (
        <Card>
          <CardHeader>Default Settings</CardHeader>
          <CardBody className="space-y-5">
            <Select
              label="Default Timezone"
              options={timezoneOptions}
              value={defaultTimezone}
              onChange={(e) => setDefaultTimezone(e.target.value)}
            />
            <Select
              label="Default Language"
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Spanish' },
                { value: 'fr', label: 'French' },
                { value: 'de', label: 'German' },
                { value: 'pt', label: 'Portuguese' },
                { value: 'ja', label: 'Japanese' },
                { value: 'ko', label: 'Korean' },
                { value: 'zh', label: 'Chinese' },
              ]}
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
            />

            <div className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Auto-approve AI posts
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Automatically approve AI-generated posts without manual review
                </p>
              </div>
              <button
                onClick={() => setAutoApprove(!autoApprove)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoApprove ? 'bg-brand-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoApprove ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex justify-end">
              <Button
                icon={<Save className="h-4 w-4" />}
                onClick={handleSaveDefaults}
                loading={saving}
              >
                Save Defaults
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
