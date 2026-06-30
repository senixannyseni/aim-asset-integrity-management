export type EvidenceLinkEntityType =
  | 'asset'
  | 'inspection_event'
  | 'ndt_measurement'
  | 'calculation_run'
  | 'calculation_input'
  | 'finding'
  | 'extraction_job'
  | 'extraction_field'
  | 'staging_record'
  | 'integrity_decision'
  | 'internal_work_order'
  | 'report'
  | 'ffs_case'
  | 'rbi_case';

export type ValidationIssue = {
  field: string;
  message: string;
  severity: 'error' | 'warning';
};

export const SUPPORTED_EVIDENCE_FILE_TYPES = [
  'PDF',
  'XLSX',
  'CSV',
  'JPG',
  'JPEG',
  'PNG',
  'DWG',
  'DXF',
  'STL',
  'ZIP'
] as const;

export const LINK_ENTITY_TYPES: EvidenceLinkEntityType[] = [
  'asset',
  'inspection_event',
  'ndt_measurement',
  'calculation_run',
  'calculation_input',
  'finding',
  'extraction_job',
  'extraction_field',
  'staging_record',
  'integrity_decision',
  'internal_work_order',
  'report',
  'ffs_case',
  'rbi_case'
];

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function asInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0 && /^-?\d+$/.test(value.trim())) return Number(value);
  return undefined;
}

export function asDateString(value: unknown): string | undefined {
  const raw = asString(value);
  if (!raw) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
}

export function normalizeFileType(value: unknown): string | undefined {
  const raw = asString(value);
  if (!raw) return undefined;
  return raw.replace(/^\./, '').toUpperCase();
}

export function isSupportedEvidenceFileType(value: unknown): boolean {
  const fileType = normalizeFileType(value);
  return Boolean(fileType && (SUPPORTED_EVIDENCE_FILE_TYPES as readonly string[]).includes(fileType));
}

export const EXPECTED_MIME_PREFIX_BY_FILE_TYPE: Record<string, string[]> = {
  PDF: ['application/pdf'],
  XLSX: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  CSV: ['text/csv', 'application/csv', 'application/vnd.ms-excel'],
  JPG: ['image/jpeg'],
  JPEG: ['image/jpeg'],
  PNG: ['image/png'],
  DWG: ['application/acad', 'application/x-acad', 'image/vnd.dwg', 'application/octet-stream'],
  DXF: ['image/vnd.dxf', 'application/dxf', 'application/octet-stream'],
  STL: ['model/stl', 'application/sla', 'application/vnd.ms-pki.stl', 'application/octet-stream'],
  ZIP: ['application/zip', 'application/x-zip-compressed']
};

export function expectedMimeTypesFor(fileType: string): string[] {
  return EXPECTED_MIME_PREFIX_BY_FILE_TYPE[fileType.toUpperCase()] ?? ['application/octet-stream'];
}

export function isExpectedMimeForFileType(fileType: string, mimeType: string): boolean {
  const normalizedMime = mimeType.toLowerCase();
  return expectedMimeTypesFor(fileType).some((expected) => normalizedMime === expected.toLowerCase());
}

export function isSha256(value: unknown): boolean {
  const raw = asString(value);
  return Boolean(raw && /^[a-f0-9]{64}$/i.test(raw));
}

export function buildEvidenceCode(year = new Date().getUTCFullYear(), runningNumber = 1): string {
  return `EVD-${year}-${String(runningNumber).padStart(6, '0')}`;
}

export function buildEvidenceObjectPath(input: {
  assetTag: string;
  inspectionId?: string | null;
  evidenceCode: string;
  fileName: string;
}): string {
  const safeAssetTag = input.assetTag.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeInspectionId = (input.inspectionId ?? 'no-inspection').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeEvidenceCode = input.evidenceCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFileName = input.fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return `/evidence/${safeAssetTag}/${safeInspectionId}/${safeEvidenceCode}/${safeFileName}`;
}

export function validateEvidenceUploadPayload(body: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const requiredFields = ['asset_id', 'file_name', 'file_type', 'method', 'component', 'inspection_date', 'checksum'];

  for (const field of requiredFields) {
    if (!asString(body[field])) {
      issues.push({ field, message: `${field} is required.`, severity: 'error' });
    }
  }

  const fileType = normalizeFileType(body.file_type);
  const mimeType = asString(body.mime_type);
  const fileSizeBytes = asInteger(body.file_size_bytes);

  if (asString(body.file_type) && !isSupportedEvidenceFileType(body.file_type)) {
    issues.push({ field: 'file_type', message: 'Unsupported evidence file type.', severity: 'error' });
  }

  if (fileType && mimeType && !isExpectedMimeForFileType(fileType, mimeType)) {
    issues.push({ field: 'mime_type', message: 'MIME type does not match supported file type expectation.', severity: 'error' });
  }

  if (fileSizeBytes === undefined || fileSizeBytes < 0) {
    issues.push({ field: 'file_size_bytes', message: 'file_size_bytes is required and must be a non-negative integer.', severity: 'error' });
  }

  if (asString(body.checksum) && !isSha256(body.checksum)) {
    issues.push({ field: 'checksum', message: 'checksum must be a SHA-256 hex string.', severity: 'error' });
  }

  if (asString(body.inspection_date) && !asDateString(body.inspection_date)) {
    issues.push({ field: 'inspection_date', message: 'inspection_date must use YYYY-MM-DD.', severity: 'error' });
  }

  return issues;
}

export function isEvidenceLinkEntityType(value: unknown): value is EvidenceLinkEntityType {
  return typeof value === 'string' && LINK_ENTITY_TYPES.includes(value as EvidenceLinkEntityType);
}

export function validateEvidenceLinkPayload(body: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isEvidenceLinkEntityType(body.linked_entity_type)) {
    issues.push({ field: 'linked_entity_type', message: 'Unsupported linked entity type.', severity: 'error' });
  }
  if (!asString(body.linked_entity_id)) {
    issues.push({ field: 'linked_entity_id', message: 'linked_entity_id is required.', severity: 'error' });
  }
  if (!asString(body.link_reason)) {
    issues.push({ field: 'link_reason', message: 'link_reason is required.', severity: 'error' });
  }
  return issues;
}
