import { pool } from '../db/client.js';
import { isPermission, isRole, type Permission, type Role } from '../rbac/roles.js';

export type AuthenticatedUserContext = {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  permissions: Permission[];
  authType: 'jwt' | 'local_demo';
  tokenId?: string;
};

type UserContextRow = {
  id: string;
  email: string;
  full_name: string;
  status: string;
  locked_until: Date | string | null;
  roles: string[] | string | null;
  permissions: string[] | string | null;
};

function toStringArray(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return value
    .replace(/^\{/, '')
    .replace(/\}$/, '')
    .split(',')
    .map((item) => item.replace(/^"|"$/g, '').trim())
    .filter(Boolean);
}

export async function loadUserContextById(userId: string, tokenId?: string): Promise<AuthenticatedUserContext | undefined> {
  const result = await pool.query<UserContextRow>(
    `select
       u.id,
       u.email,
       u.full_name,
       u.status,
       u.locked_until,
       coalesce(array_agg(distinct r.role_code) filter (where r.role_code is not null), '{}') as roles,
       coalesce(array_agg(distinct p.permission_code) filter (where p.permission_code is not null), '{}') as permissions
     from users u
     left join user_roles ur on ur.user_id = u.id
     left join roles r on r.id = ur.role_id
     left join role_permissions rp on rp.role_id = r.id
     left join permissions p on p.id = rp.permission_id
     where u.id = $1
     group by u.id`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) return undefined;
  if (row.status !== 'active') return undefined;
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) return undefined;

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    roles: toStringArray(row.roles).filter(isRole),
    permissions: toStringArray(row.permissions).filter(isPermission),
    authType: 'jwt',
    tokenId
  };
}
