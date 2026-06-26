'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type UserRow = { user_id: string; email: string; full_name: string; status: string; sensitive_fields_omitted?: string[] };
type RoleRow = { role_id: string; role_code: string; role_name: string; description?: string | null };
type PermissionRow = { permission_id: string; permission_code: string; description?: string | null };
type RolePermissionRow = { role_id: string; role_code: string; permission_id: string; permission_code: string };
type UserRoleRow = { user_id: string; email: string; full_name: string; role_id: string; role_code: string; role_name: string };
type SettingRow = { setting_key: string; setting_value: unknown; classification: string; update_allowed: boolean; description?: string | null; redaction_notice?: string | null };

type AdminData = {
  users: UserRow[];
  roles: RoleRow[];
  permissions: PermissionRow[];
  rolePermissions: RolePermissionRow[];
  userRoles: UserRoleRow[];
  settings: SettingRow[];
};

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

  async function submitRoleAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const action = fieldValue(form, 'action');
    const userId = fieldValue(form, 'user_id');
    const roleId = fieldValue(form, 'role_id');
    const reason = fieldValue(form, 'reason');
    const response = await apiFetch('/api/v1/admin-governance/user-roles', {
      method: action === 'remove' ? 'DELETE' : 'POST',
      body: JSON.stringify({ user_id: userId, role_id: roleId, reason })
    });
    const payload = await response.json();
    setMessage(response.ok ? `Role ${action === 'remove' ? 'removed' : 'assigned'} with audit ID ${payload.auditLogId ?? '-'}.` : payload?.error?.message ?? 'Role change blocked.');
    if (response.ok) {
      form.reset();
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
    const response = await apiFetch(`/api/v1/admin-governance/system-settings/${encodeURIComponent(settingKey)}`, {
      method: 'PATCH',
      body: JSON.stringify({ setting_value: settingValue, reason })
    });
    const payload = await response.json();
    setMessage(response.ok ? `Setting updated with audit ID ${payload.auditLogId ?? '-'}.` : payload?.error?.message ?? 'Setting update blocked.');
    if (response.ok) {
      form.reset();
      await loadAdminGovernance();
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC3-E Admin Governance</p>
          <h1>Admin Governance Console</h1>
          <p>RBAC-controlled visibility and safe, audited administration for users, roles, permissions, assignments, and redacted system settings.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/audit-logs">Audit Logs</Link>
          <Link className="secondary-button" href="/">Home</Link>
        </div>
      </header>

      {message && <div className="notice"><p>{message}</p></div>}
      {loading && <div className="notice"><p>Loading admin governance data...</p></div>}

      <section className="panel wide-panel">
        <div className="panel-heading row-between">
          <div>
            <h2>Users and User-Role Assignments</h2>
            <p>Sensitive credentials are omitted. User-role changes require admin_governance.manage_roles and a meaningful reason.</p>
          </div>
          <span className="badge">Secrets hidden</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Status</th><th>Roles</th><th>Omitted Fields</th></tr></thead>
            <tbody>{data.users.map((user) => (
              <tr key={user.user_id}>
                <td>{user.full_name}<br /><code>{user.email}</code></td>
                <td>{user.status}</td>
                <td>{data.userRoles.filter((assignment) => assignment.user_id === user.user_id).map((assignment) => assignment.role_code).join(', ') || '-'}</td>
                <td>{user.sensitive_fields_omitted?.join(', ') ?? 'password_hash, tokens'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading"><h2>Controlled Role Assignment</h2><p>No self-escalation, service actors, or last-admin removal. Every accepted change is audited.</p></div>
        <form className="form-grid" onSubmit={submitRoleAssignment}>
          <label><span>Action</span><select name="action" defaultValue="assign"><option value="assign">Assign role</option><option value="remove">Remove role</option></select></label>
          <label><span>User</span><select name="user_id" required><option value="">Select user</option>{data.users.map((user) => <option key={user.user_id} value={user.user_id}>{user.email}</option>)}</select></label>
          <label><span>Role</span><select name="role_id" required><option value="">Select role</option>{data.roles.map((role) => <option key={role.role_id} value={role.role_id}>{role.role_code}</option>)}</select></label>
          <label className="wide-field"><span>Reason</span><input name="reason" placeholder="Meaningful reason required for audit trail" required /></label>
          <div className="action-row"><button className="primary-button" type="submit">Submit audited role change</button></div>
        </form>
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading"><h2>Roles and Permissions</h2><p>Role-permission mappings are visible for governance review. Permission changes are not directly editable here.</p></div>
        <div className="grid-two">
          {data.roles.map((role) => (
            <article key={role.role_id}>
              <h3>{role.role_code}</h3>
              <p>{role.description ?? role.role_name}</p>
              <p><strong>Permissions:</strong> {data.rolePermissions.filter((item) => item.role_id === role.role_id).map((item) => item.permission_code).join(', ') || '-'}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading row-between"><div><h2>System Settings</h2><p>Secret, credential, environment-derived, and signed URL settings are redacted or blocked. Only allowlisted non-secret settings can be updated.</p></div><span className="badge">Redacted</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Setting</th><th>Value</th><th>Classification</th><th>Update</th></tr></thead>
            <tbody>{data.settings.length === 0 ? <tr><td colSpan={4}>No system settings found.</td></tr> : data.settings.map((setting) => (
              <tr key={setting.setting_key}>
                <td>{setting.setting_key}<br /><small>{setting.description ?? '-'}</small></td>
                <td><code>{stringify(setting.setting_value)}</code></td>
                <td>{setting.classification}</td>
                <td>{setting.update_allowed ? 'Allowlisted' : 'Read-only / blocked'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <form className="form-grid" onSubmit={submitSettingUpdate}>
          <label><span>Allowlisted Setting Key</span><input name="setting_key" placeholder="governance_banner_text" required /></label>
          <label><span>New Value JSON/String</span><input name="setting_value" placeholder='"Visible governance notice" or 24' required /></label>
          <label className="wide-field"><span>Reason</span><input name="reason" placeholder="Meaningful reason required for audit trail" required /></label>
          <div className="action-row"><button className="primary-button" type="submit">Submit audited setting update</button></div>
        </form>
      </section>

      <section className="panel wide-panel">
        <h2>Boundaries</h2>
        <p>No direct database editor, raw JSON secret editor, audit log edit/delete controls, dashboard KPI cards, n8n workflow console, NDT visualization, or hypercare dashboard is implemented in RC3-E.</p>
      </section>
    </main>
  );
}
