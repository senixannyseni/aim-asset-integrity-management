import 'dotenv/config';

export type EnvSource = Record<string, string | undefined>;

export type AppConfig = {
  appEnv: string;
  port: number;
  corsOrigin: string;
  databaseUrl: string;
  dbSsl: boolean;
  dbPoolMax: number;
  authJwtSecret: string;
  authTokenIssuer: string;
  authAccessTokenTtlSeconds: number;
  authRefreshTokenTtlSeconds: number;
  authRequireStrongSecretInProduction: boolean;
  allowLocalDemoAuth: boolean;
  authLocalDemoPassword: string;
  objectStorage: {
    provider: string;
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    /** Backward-compatible alias for older internal callers. Prefer accessKeyId. */
    accessKey: string;
    /** Backward-compatible alias for older internal callers. Prefer secretAccessKey. */
    secretKey: string;
    forcePathStyle: boolean;
    publicBaseUrl?: string;
    signedUrlTtlSeconds: number;
    maxFileSizeBytes: number;
    allowedMimeTypes: string[];
    allowedExtensions: string[];
  };
  n8n: {
    fileIntakeWebhookUrl: string;
    validationNotificationWebhookUrl: string;
    reviewNotificationWebhookUrl: string;
    reportGenerationWebhookUrl: string;
    errorQueueWebhookUrl: string;
  };
  reportGenerator: {
    baseUrl: string;
    apiKey: string;
    templateBucket: string;
    outputBucket: string;
    defaultTemplateId: string;
    timeoutSeconds: number;
  };
};

export function isLocalLikeEnv(appEnv: string): boolean {
  return appEnv === 'local' || appEnv === 'development' || appEnv === 'test';
}

export function isProductionLikeEnv(appEnv: string): boolean {
  return !isLocalLikeEnv(appEnv);
}

function required(env: EnvSource, name: string, fallback?: string): string {
  const value = env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readAliasedEnv(env: EnvSource, primaryName: string, legacyName: string): string | undefined {
  return env[primaryName] ?? env[legacyName];
}

function requiredForEnv(env: EnvSource, name: string, appEnv: string, localFallback?: string): string {
  const value = env[name];
  if (value) return value;
  if (isLocalLikeEnv(appEnv) && localFallback) return localFallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

function requiredAliasedForEnv(
  env: EnvSource,
  primaryName: string,
  legacyName: string,
  appEnv: string,
  localFallback?: string
): string {
  const value = readAliasedEnv(env, primaryName, legacyName);
  if (value) return value;
  if (isLocalLikeEnv(appEnv) && localFallback) return localFallback;
  throw new Error(`Missing required environment variable: ${primaryName}`);
}

function numberEnv(env: EnvSource, name: string, fallback: number): number {
  const raw = env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }
  return parsed;
}

function boolEnv(env: EnvSource, name: string, fallback: boolean): boolean {
  const raw = env[name];
  if (!raw) return fallback;
  return raw.toLowerCase() === 'true';
}

function csvEnv(env: EnvSource, name: string, fallback: string[]): string[] {
  const raw = env[name];
  if (!raw) return fallback;
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateProductionSecret(name: string, value: string): void {
  const weakMarkers = ['change-me', 'changeme', 'replace-with', 'local-dev', 'local-', 'minioadmin'];
  const lower = value.toLowerCase();
  if (value.length < 32 || weakMarkers.some((marker) => lower.includes(marker))) {
    throw new Error(`${name} must be a strong secret in production-like environments.`);
  }
}

function evidenceMaxFileSizeBytes(env: EnvSource): number {
  const explicitBytes = env.EVIDENCE_MAX_FILE_SIZE_BYTES;
  if (explicitBytes) {
    const parsed = Number(explicitBytes);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error('Invalid numeric environment variable: EVIDENCE_MAX_FILE_SIZE_BYTES');
    }
    return parsed;
  }

  const legacyMb = env.OBJECT_STORAGE_MAX_FILE_SIZE_MB;
  if (legacyMb) {
    const parsed = Number(legacyMb);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error('Invalid numeric environment variable: OBJECT_STORAGE_MAX_FILE_SIZE_MB');
    }
    return parsed * 1024 * 1024;
  }

  return 100 * 1024 * 1024;
}

export function loadConfig(env: EnvSource = process.env): AppConfig {
  const appEnv = required(env, 'APP_ENV', 'local');
  const allowLocalDemoAuth = isLocalLikeEnv(appEnv) && boolEnv(env, 'AUTH_ALLOW_LOCAL_DEMO', true);
  const authRequireStrongSecretInProduction = boolEnv(env, 'AUTH_REQUIRE_STRONG_SECRET_IN_PRODUCTION', true);
  const authJwtSecret = requiredForEnv(env, 'AUTH_JWT_SECRET', appEnv, 'local-dev-secret-change-me-32-chars-minimum');

  if (isProductionLikeEnv(appEnv) && authRequireStrongSecretInProduction) {
    validateProductionSecret('AUTH_JWT_SECRET', authJwtSecret);
  }

  const accessKeyId = requiredAliasedForEnv(env, 'OBJECT_STORAGE_ACCESS_KEY_ID', 'OBJECT_STORAGE_ACCESS_KEY', appEnv, 'minioadmin');
  const secretAccessKey = requiredAliasedForEnv(env, 'OBJECT_STORAGE_SECRET_ACCESS_KEY', 'OBJECT_STORAGE_SECRET_KEY', appEnv, 'minioadmin');

  if (isProductionLikeEnv(appEnv)) {
    requiredForEnv(env, 'OBJECT_STORAGE_ENDPOINT', appEnv);
    requiredForEnv(env, 'OBJECT_STORAGE_REGION', appEnv);
    requiredForEnv(env, 'OBJECT_STORAGE_BUCKET', appEnv);
    requiredAliasedForEnv(env, 'OBJECT_STORAGE_ACCESS_KEY_ID', 'OBJECT_STORAGE_ACCESS_KEY', appEnv);
    requiredAliasedForEnv(env, 'OBJECT_STORAGE_SECRET_ACCESS_KEY', 'OBJECT_STORAGE_SECRET_KEY', appEnv);
  }

  return {
    appEnv,
    port: numberEnv(env, 'PORT', 4000),
    corsOrigin: requiredForEnv(env, 'CORS_ORIGIN', appEnv, 'http://localhost:3000'),
    databaseUrl: requiredForEnv(env, 'DATABASE_URL', appEnv, 'postgresql://aim_user:aim_password@127.0.0.1:5433/aim_tank_integrity'),
    dbSsl: boolEnv(env, 'DB_SSL', false),
    dbPoolMax: numberEnv(env, 'DB_POOL_MAX', 10),
    authJwtSecret,
    authTokenIssuer: requiredForEnv(env, 'AUTH_TOKEN_ISSUER', appEnv, 'aim-api-local'),
    authAccessTokenTtlSeconds: numberEnv(env, 'AUTH_ACCESS_TOKEN_TTL_SECONDS', 900),
    authRefreshTokenTtlSeconds: numberEnv(env, 'AUTH_REFRESH_TOKEN_TTL_SECONDS', 604800),
    authRequireStrongSecretInProduction,
    allowLocalDemoAuth,
    authLocalDemoPassword: allowLocalDemoAuth
      ? requiredForEnv(env, 'AUTH_LOCAL_DEMO_PASSWORD', appEnv, 'ChangeMe123!')
      : env.AUTH_LOCAL_DEMO_PASSWORD ?? '',
    objectStorage: {
      provider: requiredForEnv(env, 'OBJECT_STORAGE_PROVIDER', appEnv, 's3-compatible'),
      endpoint: requiredForEnv(env, 'OBJECT_STORAGE_ENDPOINT', appEnv, 'http://localhost:9000'),
      region: requiredForEnv(env, 'OBJECT_STORAGE_REGION', appEnv, 'us-east-1'),
      bucket: requiredForEnv(env, 'OBJECT_STORAGE_BUCKET', appEnv, 'aim-evidence-local'),
      accessKeyId,
      secretAccessKey,
      accessKey: accessKeyId,
      secretKey: secretAccessKey,
      forcePathStyle: boolEnv(env, 'OBJECT_STORAGE_FORCE_PATH_STYLE', true),
      publicBaseUrl: env.OBJECT_STORAGE_PUBLIC_BASE_URL,
      signedUrlTtlSeconds: numberEnv(env, 'OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS', 900),
      maxFileSizeBytes: evidenceMaxFileSizeBytes(env),
      allowedMimeTypes: csvEnv(env, 'EVIDENCE_ALLOWED_MIME_TYPES', [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]),
      allowedExtensions: csvEnv(env, 'EVIDENCE_ALLOWED_EXTENSIONS', ['.pdf', '.jpg', '.jpeg', '.png', '.csv', '.xlsx'])
    },
    n8n: {
      fileIntakeWebhookUrl: requiredForEnv(env, 'N8N_FILE_INTAKE_WEBHOOK_URL', appEnv, 'http://localhost:5678/webhook/aim-file-intake'),
      validationNotificationWebhookUrl: requiredForEnv(env, 'N8N_VALIDATION_NOTIFICATION_WEBHOOK_URL', appEnv, 'http://localhost:5678/webhook/aim-validation-notification'),
      reviewNotificationWebhookUrl: requiredForEnv(env, 'N8N_REVIEW_NOTIFICATION_WEBHOOK_URL', appEnv, 'http://localhost:5678/webhook/aim-review-notification'),
      reportGenerationWebhookUrl: requiredForEnv(env, 'N8N_REPORT_GENERATION_WEBHOOK_URL', appEnv, 'http://localhost:5678/webhook/aim-report-generation'),
      errorQueueWebhookUrl: requiredForEnv(env, 'N8N_ERROR_QUEUE_WEBHOOK_URL', appEnv, 'http://localhost:5678/webhook/aim-error-queue')
    },
    reportGenerator: {
      baseUrl: requiredForEnv(env, 'REPORT_GENERATOR_BASE_URL', appEnv, 'http://localhost:4100'),
      apiKey: requiredForEnv(env, 'REPORT_GENERATOR_API_KEY', appEnv, 'local-report-generator-key'),
      templateBucket: requiredForEnv(env, 'REPORT_TEMPLATE_BUCKET', appEnv, 'aim-report-templates-local'),
      outputBucket: requiredForEnv(env, 'REPORT_OUTPUT_BUCKET', appEnv, 'aim-report-output-local'),
      defaultTemplateId: requiredForEnv(env, 'REPORT_DEFAULT_TEMPLATE_ID', appEnv, 'tank-integrity-mvp-v1'),
      timeoutSeconds: numberEnv(env, 'REPORT_GENERATION_TIMEOUT_SECONDS', 120)
    }
  };
}

export const config: AppConfig = loadConfig();
