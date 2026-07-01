'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { ActionModal, CompactDataTable, DetailDrawer, DetailGrid, KpiCard, PageHeader, StatusBadge, TechnicalJson } from '../components/ProgressiveDisclosure';

type UserRow = { user_id: string; email: string; full_name: string; status: string; sensitive_fields_omitted?: string[] };
type RoleRow = { role_id: string; role_code: string; role_name: string; description?: string | null };
type PermissionRow = { permission_id: string; permission_code: string; description?: string | null };
type RolePermissionRow = { role_id: string; role_code: string; permission_id: string; permission_code: string };
type UserRoleRow = { user_id: string; email: string; full_name: string; role_id: string; role_code: string; role_name: string };
type SettingRow = { setting_key: string; setting_value: unknown; classification: string; update_allowed: boolean; description?: string | null; redaction_notice?: string | null };
type AdminData = { users: UserRow[]; roles: RoleRow[]; permissions: PermissionRow[]; rolePermissions: RolePermissionRow[]; userRoles: UserRoleRow[]; settings: SettingRow[] };

function stringify(value: unknown): string {
  if (value === undefined || value === null) return '-';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function fieldValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

async function loadList<T>(path: string): Promise<T[]> {
  const response = await apiFetch(path, { cache: 'no-store' });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message ?? `Failed to load ${path}`);
  return payload.data ?? [];
}

export default function AdminGovernanceClient() {
  const [data, setData] = useState<AdminData>({ users: [], roles: [], permissions: [], rolePermissions: [], userRoles: [], settings: [] });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleRow | null>(null);
  const [selectedSetting, setSelectedSetting] = useState<SettingRow | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [settingModalOpen, setSettingModalOpen] = useState(false);

  async function loadAdminGovernance() {
    setLoading(true);
    setMessage(null);
    try {
      const [users, roles, permissions, rolePermissions, userRoles, settings] = await Promise.all([
        loadList<UserRow>('/api/v1/admin-governance/users'),
        loadList<RoleRow>('/api/v1/admin-governance/roles'),
        loadList<PermissionRow>('/api/v1/admin-governance/permissions'),
        loadList<RolePermissionRow>('/api/v1/admin-governance/role-permissions'),
        loadList<UserRoleRow>('/api/v1/admin-governance/user-roles'),
        loadList<SettingRow>('/api/v1/admin-governance/system-settings')
      ]);
      setData({ users, roles, permissions, rolePermissions, userRoles, settings });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load admin governance data. Confirm admin_governance.view permission.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAdminGovernance();
  }, []);

  const counts = useMemo(() => ({
    users: data.users.length,
    roles: data.roles.length,
    permissions: data.permissions.length,
    settings: data.settings.length,
    blockedSettings: data.settings.filter((setting) => !setting.update_allowed).length
  }), [data]);

  function rolesForUser(userId: string): string {
    return data.userRoles.filter((assignment) => assignment.user_id === userId).map((assignment) => assignment.role_code).join(', ') || '-';
  }

  function permissionsForRole(roleId: string): string[] {
    return data.rolePermissions.filter((item) => item.role_id === roleId).map((item) => item.permission_code);
  }

  async function submitRoleAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const action = fieldValue(form, 'action');
    const userId = fieldValue(form, 'user_id');
    const roleId = fieldValue(form, 'role_id');
    const reason = fieldValue(form, 'reason');
    const response = await apiFetch('/api/v1/admin-governance/user-roles', { method: action === 'remove' ? 'DELETE' : 'POST', body: JSON.stringify({ user_id: userId, role_id: roleId, reason }) });
    const payload = await response.json();
    setMessage(response.ok ? `Role ${action === 'remove' ? 'removed' : 'assigned'} with audit ID ${payload.auditLogId ?? '-'}.` : payload?.error?.message ?? 'Role change blocked.');
    if (response.ok) {
      form.reset();
      setRoleModalOpen(false);
      await loadAdminGovernance();
    }
  }

  async function submitSettingUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const settingKey = fieldValue(form, 'setting_key');
    const rawValue = fieldValue(form, 'setting_value');
    const reason = fieldValue(form, 'reason');
    let settingValue: unknown = rawValue;
    try {
      settingValue = JSON.parse(rawValue);
    } catch {
      settingValue = rawValue;
    }
    const response = await apiFetch(`/api/v1/admin-governance/system-settings/${encodeURIComponent(settingKey)}`, { method: 'PATCH', body: JSON.stringify({ setting_value: settingValue, reason }) });
    const payload = await response.json();
    setMessage(response.ok ? `Setting updated with audit ID ${payload.auditLogId ?? '-'}.` : payload?.error?.message ?? 'Setting update blocked.');
    if (response.ok) {
      form.reset();
      setSettingModalOpen(false);
      await loadAdminGovernance();
    }
  }

  return (
    <main className="app-shell">
      <PageHeader
        eyebrow="RC3-E admin governance"
        title="Admin Governance"
        description="Review compact user, role, permission, and setting summaries. Full permission matrices, sensitive setting values, and audited changes are disclosed in drawers or dialogs."
        status={counts.blockedSettings > 0 ? 'pending_review' : 'approved'}
        actions={<><button className="primary-button" type="button" onClick={() => setRoleModalOpen(true)}>Assign Role</button><button className="secondary-button" type="button" onClick={() => setSettingModalOpen(true)}>Update Setting</button><Link className="secondary-button" href="/audit-logs">Audit Logs</Link></>}
      />

      {message && <div className="notice"><p>{message}</p></div>}
      {loading && <div className="notice"><p>Loading admin governance data...</p></div>}

      <section className="pd-kpi-grid" aria-label="Admin summary">
        <KpiCard title="Users" value={counts.users} helper="credentials omitted" />
        <KpiCard title="Roles" value={counts.roles} helper="permission groups" />
        <KpiCard title="Permissions" value={counts.permissions} helper="matrix in drawer" />
        <KpiCard title="Read-only Settings" value={counts.blockedSettings} helper="blocked or redacted" status={counts.blockedSettings > 0 ? 'pending_review' : 'approved'} />
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading row-between">
          <div>
            <h2>Users</h2>
            <p>Compact identity summary. Sensitive fields and full assignments are in the drawer.</p>
          </div>
          <StatusBadge status="approved" label="secrets hidden" />
        </div>
        <CompactDataTable
          rows={data.users}
          getRowKey={(user) => user.user_id}
          emptyTitle="No users"
          emptyMessage="No user records were returned."
          columns={[
            { header: 'User', render: (user) => <span>{user.full_name}<br /><code>{user.email}</code></span> },
            { header: 'Status', render: (user) => <StatusBadge status={user.status} /> },
            { header: 'Roles', render: (user) => rolesForUser(user.user_id) },
            { header: 'Action', className: 'pd-cell-actions', render: (user) => <button className="secondary-button" type="button" onClick={() => setSelectedUser(user)}>View details</button> }
          ]}
        />
      </section>

      <section className="grid-two">
        <section className="panel">
          <div className="panel-heading"><h2>Roles</h2><p>Permission counts only by default.</p></div>
          <CompactDataTable
            rows={data.roles}
            getRowKey={(role) => role.role_id}
            emptyTitle="No roles"
            emptyMessage="No role records were returned."
            columns={[
              { header: 'Role', render: (role) => role.role_code },
              { header: 'Name', render: (role) => role.role_name },
              { header: 'Permissions', render: (role) => permissionsForRole(role.role_id).length },
              { header: 'Action', className: 'pd-cell-actions', render: (role) => <button className="secondary-button" type="button" onClick={() => setSelectedRole(role)}>View details</button> }
            ]}
          />
        </section>
        <section className="panel">
          <div className="panel-heading"><h2>System Settings</h2><p>Values are summarized; secrets and raw values stay in drawers.</p></div>
          <CompactDataTable
            rows={data.settings}
            getRowKey={(setting) => setting.setting_key}
            emptyTitle="No settings"
            emptyMessage="No system settings found."
            columns={[
              { header: 'Setting', render: (setting) => setting.setting_key },
              { header: 'Classification', render: (setting) => <StatusBadge status={setting.update_allowed ? 'pending_review' : 'blocked'} label={setting.classification} /> },
              { header: 'Update', render: (setting) => setting.update_allowed ? 'Allowlisted' : 'Read-only' },
              { header: 'Action', className: 'pd-cell-actions', render: (setting) => <button className="secondary-button" type="button" onClick={() => setSelectedSetting(setting)}>View details</button> }
            ]}
          />
        </section>
      </section>

      <DetailDrawer open={Boolean(selectedUser)} title={selectedUser?.full_name ?? 'User details'} subtitle={selectedUser?.email} status={selectedUser?.status} onClose={() => setSelectedUser(null)} tabs={selectedUser ? [
        { id: 'overview', label: 'Overview', content: <DetailGrid items={[{ label: 'User ID', value: <code>{selectedUser.user_id}</code> }, { label: 'Email', value: selectedUser.email }, { label: 'Roles', value: rolesForUser(selectedUser.user_id) }, { label: 'Omitted Fields', value: selectedUser.sensitive_fields_omitted?.join(', ') ?? 'password_hash, tokens' }]} /> },
        { id: 'audit', label: 'Audit Trail', content: <Link className="secondary-button" href={`/audit-logs?entity_type=user&entity_id=${selectedUser.user_id}`}>Open audit trail</Link> },
        { id: 'raw', label: 'Raw Metadata', content: <TechnicalJson value={selectedUser} /> }
      ] : []} />

      <DetailDrawer open={Boolean(selectedRole)} title={selectedRole?.role_code ?? 'Role details'} subtitle={selectedRole?.role_name} status="approved" onClose={() => setSelectedRole(null)} tabs={selectedRole ? [
        { id: 'overview', label: 'Overview', content: <DetailGrid items={[{ label: 'Role ID', value: <code>{selectedRole.role_id}</code> }, { label: 'Name', value: selectedRole.role_name }, { label: 'Description', value: selectedRole.description ?? '-' }, { label: 'Permission Count', value: permissionsForRole(selectedRole.role_id).length }]} /> },
        { id: 'technical', label: 'Technical Data', content: <TechnicalJson value={permissionsForRole(selectedRole.role_id)} /> },
        { id: 'audit', label: 'Audit Trail', content: <Link className="secondary-button" href={`/audit-logs?entity_type=role&entity_id=${selectedRole.role_id}`}>Open audit trail</Link> }
      ] : []} />

      <DetailDrawer open={Boolean(selectedSetting)} title={selectedSetting?.setting_key ?? 'Setting details'} subtitle={selectedSetting?.description ?? undefined} status={selectedSetting?.update_allowed ? 'pending_review' : 'blocked'} onClose={() => setSelectedSetting(null)} tabs={selectedSetting ? [
        { id: 'overview', label: 'Overview', content: <DetailGrid items={[{ label: 'Classification', value: selectedSetting.classification }, { label: 'Update Allowed', value: selectedSetting.update_allowed ? 'yes' : 'no' }, { label: 'Redaction', value: selectedSetting.redaction_notice ?? 'Sensitive settings are redacted.' }]} /> },
        { id: 'technical', label: 'Technical Data', content: <TechnicalJson value={selectedSetting.setting_value} /> },
        { id: 'audit', label: 'Audit Trail', content: <Link className="secondary-button" href={`/audit-logs?entity_type=system_setting&entity_id=${encodeURIComponent(selectedSetting.setting_key)}`}>Open audit trail</Link> }
      ] : []} />

      <ActionModal open={roleModalOpen} title="Controlled role assignment" subtitle="No self-escalation, service actors, or last-admin removal. Every accepted change is audited." status="pending_review" onClose={() => setRoleModalOpen(false)}>
        <form className="form-grid" onSubmit={submitRoleAssignment}>
          <label><span>Action</span><select name="action" defaultValue="assign"><option value="assign">Assign role</option><option value="remove">Remove role</option></select></label>
          <label><span>User</span><select name="user_id" required><option value="">Select user</option>{data.users.map((user) => <option key={user.user_id} value={user.user_id}>{user.email}</option>)}</select></label>
          <label><span>Role</span><select name="role_id" required><option value="">Select role</option>{data.roles.map((role) => <option key={role.role_id} value={role.role_id}>{role.role_code}</option>)}</select></label>
          <label className="wide-field"><span>Reason</span><input name="reason" placeholder="Meaningful reason required for audit trail" required /></label>
          <button className="primary-button wide-field" type="submit">Submit audited role change</button>
        </form>
      </ActionModal>

      <ActionModal open={settingModalOpen} title="Update allowlisted setting" subtitle="Secret, credential, environment-derived, and signed URL settings are redacted or blocked." status="pending_review" onClose={() => setSettingModalOpen(false)}>
        <form className="form-grid" onSubmit={submitSettingUpdate}>
          <label><span>Allowlisted Setting Key</span><input name="setting_key" placeholder="governance_banner_text" required /></label>
          <label><span>New Value JSON/String</span><input name="setting_value" placeholder='"Visible governance notice" or 24' required /></label>
          <label className="wide-field"><span>Reason</span><input name="reason" placeholder="Meaningful reason required for audit trail" required /></label>
          <button className="primary-button wide-field" type="submit">Submit audited setting update</button>
        </form>
      </ActionModal>
    </main>
  );
}
