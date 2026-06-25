import { createHash } from 'node:crypto';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../../config/env.js';
import { createS3Client } from './s3-client.js';
import type {
  ObjectMetadata,
  PutObjectInput,
  SignedDownloadInput,
  SignedUploadInput,
  SignedUrlResult
} from './object-storage-types.js';

export function sha256Hex(buffer: Buffer | Uint8Array | string): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function sanitizeObjectKeyPart(value: string, fallback = 'na'): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\\/]+/g, '-')
    .replace(/\.\.+/g, '.')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/\.-+/g, '.')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128);
  return normalized || fallback;
}

export function sanitizeFilename(filename: string): string {
  if (/[\\/]/.test(filename) || filename.includes('..')) {
    throw new Error('Invalid filename: path traversal is not allowed.');
  }
  const sanitized = sanitizeObjectKeyPart(filename, 'file');
  if (sanitized === '.' || sanitized === '..' || sanitized.includes('..')) {
    throw new Error('Invalid filename: path traversal is not allowed.');
  }
  return sanitized;
}

export function redactSignedUrl(url: string): string {
  try {
    const parsed = new URL(url, 'http://local.invalid');
    parsed.search = parsed.search ? '?REDACTED' : '';
    return parsed.toString().replace('http://local.invalid', '');
  } catch {
    return 'REDACTED_SIGNED_URL';
  }
}

export class ObjectStorageService {
  constructor(private readonly client: S3Client = createS3Client(), private readonly bucket = config.objectStorage.bucket) {}

  async putObject(input: PutObjectInput): Promise<ObjectMetadata> {
    const contentLength = Buffer.isBuffer(input.body) ? input.body.length : Buffer.byteLength(String(input.body));
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.objectKey,
      Body: input.body,
      ContentType: input.contentType,
      Metadata: input.metadata
    }));
    return {
      objectKey: input.objectKey,
      bucket: this.bucket,
      contentLength,
      contentType: input.contentType
    };
  }

  async headObject(objectKey: string): Promise<ObjectMetadata> {
    const response = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }));
    return {
      objectKey,
      bucket: this.bucket,
      contentLength: Number(response.ContentLength ?? 0),
      contentType: response.ContentType,
      eTag: response.ETag,
      versionId: response.VersionId
    };
  }

  async objectExists(objectKey: string): Promise<boolean> {
    try {
      await this.headObject(objectKey);
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUploadUrl(input: SignedUploadInput): Promise<SignedUrlResult> {
    const expiresIn = input.expiresInSeconds ?? config.objectStorage.signedUrlTtlSeconds;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.objectKey,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
      Metadata: input.checksumSha256 ? { checksum_sha256: input.checksumSha256 } : undefined
    });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return {
      url,
      objectKey: input.objectKey,
      bucket: this.bucket,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    };
  }

  async getSignedDownloadUrl(input: SignedDownloadInput): Promise<SignedUrlResult> {
    const expiresIn = input.expiresInSeconds ?? config.objectStorage.signedUrlTtlSeconds;
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: input.objectKey,
      ResponseContentType: input.responseContentType
    });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return {
      url,
      objectKey: input.objectKey,
      bucket: this.bucket,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    };
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
  }
}

export const objectStorageService = new ObjectStorageService();
