import 'dotenv/config';

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
  allowLocalDemoAuth: boolean;
  authLocalDemoPassword: string;
  objectStorage: {
    provider: string;
    endpoint: string;
    region: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    forcePathStyle: boolean;
    signedUrlTtlSeconds: number;
    maxFileSizeMb: number;
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

function isLocalLikeEnv(appEnv: string): boolean {
  return appEnv === 'local' || appEnv === 'development' || appEnv === 'test';
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requiredForEnv(name: string, appEnv: string, localFallback?: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isLocalLikeEnv(appEnv) && localFallback) return localFallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }
  return parsed;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.toLowerCase() === 'true';
}

const appEnv = required('APP_ENV', 'local');
const allowLocalDemoAuth = isLocalLikeEnv(appEnv) && boolEnv('AUTH_ALLOW_LOCAL_DEMO', true);

export const config: AppConfig = {
  appEnv,
  port: numberEnv('PORT', 4000),
  corsOrigin: requiredForEnv('CORS_ORIGIN', appEnv, 'http://localhost:3000'),
  databaseUrl: requiredForEnv('DATABASE_URL', appEnv, 'postgresql://aim_user:aim_password@127.0.0.1:5433/aim_tank_integrity'),
  dbSsl: boolEnv('DB_SSL', false),
  dbPoolMax: numberEnv('DB_POOL_MAX', 10),
  authJwtSecret: requiredForEnv('AUTH_JWT_SECRET', appEnv, 'local-dev-secret-change-me-32-chars-minimum'),
  authTokenIssuer: requiredForEnv('AUTH_TOKEN_ISSUER', appEnv, 'aim-api-local'),
  authAccessTokenTtlSeconds: numberEnv('AUTH_ACCESS_TOKEN_TTL_SECONDS', 900),
  authRefreshTokenTtlSeconds: numberEnv('AUTH_REFRESH_TOKEN_TTL_SECONDS', 604800),
  allowLocalDemoAuth,
  authLocalDemoPassword: requiredForEnv('AUTH_LOCAL_DEMO_PASSWORD', appEnv, 'ChangeMe123!'),
  objectStorage: {
    provider: requiredForEnv('OBJECT_STORAGE_PROVIDER', appEnv, 's3-compatible'),
    endpoint: requiredForEnv('OBJECT_STORAGE_ENDPOINT', appEnv, 'http://localhost:9000'),
    region: requiredForEnv('OBJECT_STORAGE_REGION', appEnv, 'us-east-1'),
    bucket: requiredForEnv('OBJECT_STORAGE_BUCKET', appEnv, 'aim-evidence-local'),
    accessKey: requiredForEnv('OBJECT_STORAGE_ACCESS_KEY', appEnv, 'minioadmin'),
    secretKey: requiredForEnv('OBJECT_STORAGE_SECRET_KEY', appEnv, 'minioadmin'),
    forcePathStyle: boolEnv('OBJECT_STORAGE_FORCE_PATH_STYLE', true),
    signedUrlTtlSeconds: numberEnv('OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS', 900),
    maxFileSizeMb: numberEnv('OBJECT_STORAGE_MAX_FILE_SIZE_MB', 100)
  },
  n8n: {
    fileIntakeWebhookUrl: requiredForEnv('N8N_FILE_INTAKE_WEBHOOK_URL', appEnv, 'http://localhost:5678/webhook/aim-file-intake'),
    validationNotificationWebhookUrl: requiredForEnv('N8N_VALIDATION_NOTIFICATION_WEBHOOK_URL', appEnv, 'http://localhost:5678/webhook/aim-validation-notification'),
    reviewNotificationWebhookUrl: requiredForEnv('N8N_REVIEW_NOTIFICATION_WEBHOOK_URL', appEnv, 'http://localhost:5678/webhook/aim-review-notification'),
    reportGenerationWebhookUrl: requiredForEnv('N8N_REPORT_GENERATION_WEBHOOK_URL', appEnv, 'http://localhost:5678/webhook/aim-report-generation'),
    errorQueueWebhookUrl: requiredForEnv('N8N_ERROR_QUEUE_WEBHOOK_URL', appEnv, 'http://localhost:5678/webhook/aim-error-queue')
  },
  reportGenerator: {
    baseUrl: requiredForEnv('REPORT_GENERATOR_BASE_URL', appEnv, 'http://localhost:4100'),
    apiKey: requiredForEnv('REPORT_GENERATOR_API_KEY', appEnv, 'local-report-generator-key'),
    templateBucket: requiredForEnv('REPORT_TEMPLATE_BUCKET', appEnv, 'aim-report-templates-local'),
    outputBucket: requiredForEnv('REPORT_OUTPUT_BUCKET', appEnv, 'aim-report-output-local'),
    defaultTemplateId: requiredForEnv('REPORT_DEFAULT_TEMPLATE_ID', appEnv, 'tank-integrity-mvp-v1'),
    timeoutSeconds: numberEnv('REPORT_GENERATION_TIMEOUT_SECONDS', 120)
  }
};
