export type ObjectStorageProvider = 's3-compatible';

export type ObjectMetadata = {
  objectKey: string;
  bucket: string;
  contentLength: number;
  contentType?: string;
  eTag?: string;
  versionId?: string;
  metadata?: Record<string, string>;
};

export type SignedUrlResult = {
  url: string;
  expiresAt: string;
  objectKey: string;
  bucket: string;
};

export type PutObjectInput = {
  objectKey: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
};

export type SignedUploadInput = {
  objectKey: string;
  contentType: string;
  contentLength: number;
  checksumSha256?: string;
  expiresInSeconds?: number;
};

export type SignedDownloadInput = {
  objectKey: string;
  responseContentType?: string;
  expiresInSeconds?: number;
};

export type TenantObjectKeyScope = {
  tenantId: string;
  tenantSlug: string;
};

export type EvidenceObjectKeyInput = {
  tenant?: TenantObjectKeyScope;
  assetTagOrId: string;
  inspectionId?: string | null;
  evidenceCode: string;
  filename: string;
};

export type ReportObjectKeyInput = {
  tenant?: TenantObjectKeyScope;
  reportId: string;
  exportId: string;
  filename: string;
};
