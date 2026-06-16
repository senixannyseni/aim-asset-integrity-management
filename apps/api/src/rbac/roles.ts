export const ROLES = [
  'admin',
  'data_entry',
  'inspector',
  'engineer',
  'senior_engineer',
  'qa_qc',
  'client_viewer',
  'ai_agent'
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'asset.read',
  'asset.create',
  'asset.update',
  'asset.delete',
  'asset.approve',
  'inspection.read',
  'inspection.create',
  'inspection.update',
  'inspection.review',
  'inspection.approve',
  'evidence.open',
  'evidence.read',
  'evidence.upload',
  'evidence.link',
  'evidence.update_metadata',
  'evidence.delete_request',
  'evidence.delete_approve',
  'ai_extraction.create',
  'ai_extraction.read',
  'ai_extraction.review',
  'ai_extraction.correct',
  'ai_extraction.promote',
  'ndt.read',
  'ndt.create',
  'ndt.import',
  'ndt.update',
  'ndt.review',
  'ndt.approve',
  'formula.read',
  'formula.create',
  'formula.update',
  'formula.approve',
  'formula.retire',
  'calculation.run',
  'calculation.read',
  'calculation.review',
  'calculation.approve',
  'calculation.revise',
  'ffs.trigger',
  'ffs.review',
  'ffs.request_assessment',
  'rbi.interface.read',
  'rbi.interface.create',
  'rbi.interface.export',
  'integrity_decision.create',
  'integrity_decision.review',
  'integrity_decision.approve',
  'report.generate',
  'report.review',
  'report.approve',
  'report.issue',
  'work_order.create',
  'work_order.update',
  'work_order.close',
  'workflow_event.create',
  'error_log.create',
  'error_log.read',
  'audit.read',
  'admin.manage'
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const readOnlyPermissions: Permission[] = [
  'asset.read',
  'inspection.read',
  'evidence.read',
  'ndt.read',
  'formula.read',
  'calculation.read',
  'rbi.interface.read'
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [...PERMISSIONS],
  data_entry: [
    'asset.read',
    'asset.create',
    'asset.update',
    'inspection.read',
    'inspection.create',
    'evidence.read',
    'evidence.upload',
    'evidence.link',
    'ai_extraction.read',
    'ndt.read',
    'ndt.import',
    'ndt.create'
  ],
  inspector: [
    'asset.read',
    'inspection.read',
    'inspection.create',
    'inspection.update',
    'evidence.read',
    'evidence.upload',
    'evidence.link',
    'ndt.read',
    'ndt.create',
    'ndt.update',
    'ndt.import',
    'work_order.create',
    'work_order.update'
  ],
  engineer: [
    'asset.read',
    'asset.update',
    'inspection.read',
    'inspection.update',
    'inspection.review',
    'evidence.read',
    'evidence.link',
    'evidence.update_metadata',
    'ai_extraction.read',
    'ai_extraction.review',
    'ai_extraction.correct',
    'ai_extraction.promote',
    'ndt.read',
    'ndt.review',
    'ndt.import',
    'formula.read',
    'calculation.run',
    'calculation.read',
    'calculation.review',
    'calculation.revise',
    'ffs.trigger',
    'ffs.review',
    'rbi.interface.read',
    'rbi.interface.create',
    'integrity_decision.create',
    'integrity_decision.review',
    'report.generate',
    'report.review',
    'work_order.create',
    'work_order.update'
  ],
  senior_engineer: [
    'asset.read',
    'asset.update',
    'asset.delete',
    'asset.approve',
    'inspection.read',
    'inspection.review',
    'inspection.approve',
    'evidence.read',
    'evidence.link',
    'evidence.update_metadata',
    'evidence.delete_request',
    'ai_extraction.read',
    'ai_extraction.review',
    'ai_extraction.correct',
    'ai_extraction.promote',
    'ndt.read',
    'ndt.review',
    'ndt.approve',
    'ndt.import',
    'formula.read',
    'formula.create',
    'formula.update',
    'calculation.run',
    'calculation.read',
    'calculation.review',
    'calculation.approve',
    'calculation.revise',
    'ffs.trigger',
    'ffs.review',
    'ffs.request_assessment',
    'rbi.interface.read',
    'rbi.interface.create',
    'rbi.interface.export',
    'integrity_decision.create',
    'integrity_decision.review',
    'integrity_decision.approve',
    'report.generate',
    'report.review',
    'report.approve',
    'work_order.create',
    'work_order.update',
    'work_order.close',
    'workflow_event.create',
    'error_log.create',
    'error_log.read',
    'audit.read'
  ],
  qa_qc: [
    'asset.read',
    'inspection.read',
    'evidence.read',
    'ai_extraction.read',
    'ndt.read',
    'ndt.import',
    'formula.read',
    'formula.approve',
    'formula.retire',
    'calculation.read',
    'calculation.review',
    'ffs.review',
    'rbi.interface.read',
    'integrity_decision.review',
    'report.review',
    'report.approve',
    'error_log.read',
    'audit.read'
  ],
  client_viewer: readOnlyPermissions,
  ai_agent: [
    'asset.read',
    'inspection.read',
    'evidence.read',
    'ai_extraction.create',
    'ai_extraction.read',
    'workflow_event.create',
    'error_log.create'
  ]
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export function permissionsForRoles(roles: Role[]): Set<Permission> {
  const granted = new Set<Permission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      granted.add(permission);
    }
  }
  return granted;
}

export function hasPermission(roles: Role[], permission: Permission): boolean {
  return permissionsForRoles(roles).has(permission);
}
