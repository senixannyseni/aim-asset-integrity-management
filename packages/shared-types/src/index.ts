export type AimRole =
  | 'admin'
  | 'data_entry'
  | 'inspector'
  | 'engineer'
  | 'senior_engineer'
  | 'qa_qc'
  | 'client_viewer'
  | 'ai_agent';

export type RecordStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'locked'
  | 'retired';

export type FormulaStatus =
  | 'draft'
  | 'under_review'
  | 'approved_active'
  | 'retired'
  | 'rejected';

export type ApiEnvelope<T> = {
  data: T;
  requestId: string;
  auditLogId?: string;
  mock: false;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
};
