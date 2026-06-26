const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|cookie|signed_url|signedurl|presigned_url|presignedurl|credential|access_key|accesskey|secret_key|secretkey|private_key|privatekey)/i;
const SIGNED_URL_VALUE_PATTERN = /(X-Amz-Signature=|X-Amz-Credential=|X-Amz-Security-Token=|Signature=|Expires=|AWSAccessKeyId=)/i;
const BEARER_VALUE_PATTERN = /^Bearer\s+/i;

export const REDACTED_VALUE = '[REDACTED]';

export function isSensitiveAuditKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

export function shouldRedactAuditValue(key: string, value: unknown): boolean {
  if (isSensitiveAuditKey(key)) return true;
  if (typeof value !== 'string') return false;
  return SIGNED_URL_VALUE_PATTERN.test(value) || BEARER_VALUE_PATTERN.test(value);
}

export function redactAuditMetadata<T = unknown>(value: T, keyHint = ''): T | string {
  if (shouldRedactAuditValue(keyHint, value)) return REDACTED_VALUE;

  if (Array.isArray(value)) {
    return value.map((item) => redactAuditMetadata(item)) as T;
  }

  if (value && typeof value === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      redacted[key] = shouldRedactAuditValue(key, nestedValue)
        ? REDACTED_VALUE
        : redactAuditMetadata(nestedValue, key);
    }
    return redacted as T;
  }

  return value;
}
