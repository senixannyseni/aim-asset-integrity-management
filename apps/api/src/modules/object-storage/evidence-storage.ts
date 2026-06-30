import path from 'node:path';
import { config } from '../../config/env.js';
import { sanitizeFilename, sanitizeObjectKeyPart } from './object-storage-service.js';
import { buildTenantScopedObjectKey } from '../tenancy/tenant-object-boundary.js';
import type { EvidenceObjectKeyInput } from './object-storage-types.js';

export function normalizeExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export function validateEvidenceObjectRequest(input: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}): { safeFilename: string; extension: string } {
  const safeFilename = sanitizeFilename(input.filename);
  const extension = normalizeExtension(safeFilename);
  if (!extension || !config.objectStorage.allowedExtensions.map((value) => value.toLowerCase()).includes(extension)) {
    throw new Error(`File extension is not allowed: ${extension || 'none'}`);
  }
  if (!config.objectStorage.allowedMimeTypes.includes(input.mimeType)) {
    throw new Error(`MIME type is not allowed: ${input.mimeType}`);
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > config.objectStorage.maxFileSizeBytes) {
    throw new Error(`File size exceeds allowed limit: ${input.sizeBytes}`);
  }
  return { safeFilename, extension };
}

export function buildEvidenceObjectKey(input: EvidenceObjectKeyInput): string {
  const assetPart = sanitizeObjectKeyPart(input.assetTagOrId, 'asset');
  const inspectionPart = sanitizeObjectKeyPart(input.inspectionId ?? 'na', 'na');
  const evidencePart = sanitizeObjectKeyPart(input.evidenceCode, 'evidence');
  const filePart = sanitizeFilename(input.filename);
  const relativeKey = `evidence/${assetPart}/${inspectionPart}/${evidencePart}/${filePart}`;
  return input.tenant ? buildTenantScopedObjectKey(input.tenant, relativeKey) : relativeKey;
}
