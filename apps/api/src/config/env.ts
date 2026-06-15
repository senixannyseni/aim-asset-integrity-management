import 'dotenv/config';

export type AppConfig = {
  appEnv: string;
  port: number;
  corsOrigin: string;
  databaseUrl: string;
  dbSsl: boolean;
  dbPoolMax: number;
  authJwtSecret: string;
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

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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

export const config: AppConfig = {
  appEnv: required('APP_ENV', 'local'),
  port: numberEnv('PORT', 4000),
  corsOrigin: required('CORS_ORIGIN', 'http://localhost:3000'),
  databaseUrl: required('DATABASE_URL', 'postgresql://aim_user:aim_password@127.0.0.1:5433/aim_tank_integrity'),
  dbSsl: boolEnv('DB_SSL', false),
  dbPoolMax: numberEnv('DB_POOL_MAX', 10),
  authJwtSecret: required('AUTH_JWT_SECRET', 'local-dev-secret-change-me-32-chars-minimum'),
  objectStorage: {
    provider: required('OBJECT_STORAGE_PROVIDER', 's3-compatible'),
    endpoint: required('OBJECT_STORAGE_ENDPOINT', 'http://localhost:9000'),
    region: required('OBJECT_STORAGE_REGION', 'us-east-1'),
    bucket: required('OBJECT_STORAGE_BUCKET', 'aim-evidence-local'),
    accessKey: required('OBJECT_STORAGE_ACCESS_KEY', 'minioadmin'),
    secretKey: required('OBJECT_STORAGE_SECRET_KEY', 'minioadmin'),
    forcePathStyle: boolEnv('OBJECT_STORAGE_FORCE_PATH_STYLE', true),
    signedUrlTtlSeconds: numberEnv('OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS', 900),
    maxFileSizeMb: numberEnv('OBJECT_STORAGE_MAX_FILE_SIZE_MB', 100)
  },
  n8n: {
    fileIntakeWebhookUrl: required('N8N_FILE_INTAKE_WEBHOOK_URL', 'http://localhost:5678/webhook/aim-file-intake'),
    validationNotificationWebhookUrl: required('N8N_VALIDATION_NOTIFICATION_WEBHOOK_URL', 'http://localhost:5678/webhook/aim-validation-notification'),
    reviewNotificationWebhookUrl: required('N8N_REVIEW_NOTIFICATION_WEBHOOK_URL', 'http://localhost:5678/webhook/aim-review-notification'),
    reportGenerationWebhookUrl: required('N8N_REPORT_GENERATION_WEBHOOK_URL', 'http://localhost:5678/webhook/aim-report-generation'),
    errorQueueWebhookUrl: required('N8N_ERROR_QUEUE_WEBHOOK_URL', 'http://localhost:5678/webhook/aim-error-queue')
  },
  reportGenerator: {
    baseUrl: required('REPORT_GENERATOR_BASE_URL', 'http://localhost:4100'),
    apiKey: required('REPORT_GENERATOR_API_KEY', 'local-report-generator-key'),
    templateBucket: required('REPORT_TEMPLATE_BUCKET', 'aim-report-templates-local'),
    outputBucket: required('REPORT_OUTPUT_BUCKET', 'aim-report-output-local'),
    defaultTemplateId: required('REPORT_DEFAULT_TEMPLATE_ID', 'tank-integrity-mvp-v1'),
    timeoutSeconds: numberEnv('REPORT_GENERATION_TIMEOUT_SECONDS', 120)
  }
};
