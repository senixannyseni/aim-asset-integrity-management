import { sanitizeFilename, sanitizeObjectKeyPart } from './object-storage-service.js';
import type { ReportObjectKeyInput } from './object-storage-types.js';

export function buildReportExportObjectKey(input: ReportObjectKeyInput): string {
  const reportPart = sanitizeObjectKeyPart(input.reportId, 'report');
  const exportPart = sanitizeObjectKeyPart(input.exportId, 'export');
  const filePart = sanitizeFilename(input.filename);
  return `reports/${reportPart}/exports/${exportPart}/${filePart}`;
}

export function reportExportMimeType(exportType: string): string {
  const normalized = exportType.toLowerCase();
  if (normalized === 'pdf') return 'application/pdf';
  if (normalized === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (normalized === 'json') return 'application/json';
  if (normalized === 'html') return 'text/html';
  return 'application/octet-stream';
}
