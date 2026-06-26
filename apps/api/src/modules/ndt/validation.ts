export type ValidationIssue = {
  field: string;
  message: string;
  severity: 'error' | 'warning';
};

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

export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

export function asDateString(value: unknown): string | undefined {
  const raw = asString(value);
  if (!raw) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
}

export function normalizeLengthToMeters(value: number, unit = 'm'): number {
  const normalizedUnit = unit.trim().toLowerCase();
  if (normalizedUnit === 'm' || normalizedUnit === 'meter' || normalizedUnit === 'meters') return value;
  if (normalizedUnit === 'mm' || normalizedUnit === 'millimeter' || normalizedUnit === 'millimeters') return value / 1000;
  if (normalizedUnit === 'cm' || normalizedUnit === 'centimeter' || normalizedUnit === 'centimeters') return value / 100;
  throw new Error(`Unsupported length unit: ${unit}`);
}

export function normalizeThicknessToMillimeters(value: number, unit = 'mm'): number {
  const normalizedUnit = unit.trim().toLowerCase();
  if (normalizedUnit === 'mm' || normalizedUnit === 'millimeter' || normalizedUnit === 'millimeters') return value;
  if (normalizedUnit === 'm' || normalizedUnit === 'meter' || normalizedUnit === 'meters') return value * 1000;
  if (normalizedUnit === 'cm' || normalizedUnit === 'centimeter' || normalizedUnit === 'centimeters') return value * 10;
  if (normalizedUnit === 'inch' || normalizedUnit === 'in') return value * 25.4;
  throw new Error(`Unsupported thickness unit: ${unit}`);
}

export function validateNdtMeasurementPayload(body: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const required = ['asset_id', 'component', 'measured_thickness', 'reading_date', 'method'];

  for (const field of required) {
    if (!asString(body[field]) && asNumber(body[field]) === undefined) {
      issues.push({ field, message: `${field} is required.`, severity: 'error' });
    }
  }

  const thickness = asNumber(body.measured_thickness);
  if (thickness !== undefined && thickness <= 0) {
    issues.push({ field: 'measured_thickness', message: 'measured_thickness must be greater than zero.', severity: 'error' });
  }

  const confidence = asNumber(body.confidence);
  if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
    issues.push({ field: 'confidence', message: 'confidence must be between 0 and 1.', severity: 'error' });
  }

  if (asString(body.reading_date) && !asDateString(body.reading_date)) {
    issues.push({ field: 'reading_date', message: 'reading_date must use YYYY-MM-DD.', severity: 'error' });
  }

  const extractionSource = asString(body.extraction_source);
  const allowedExtractionSources = ['manual', 'bulk_import', 'ai_staging', 'vendor_import'];
  if (extractionSource && !allowedExtractionSources.includes(extractionSource)) {
    issues.push({
      field: 'extraction_source',
      message: `extraction_source must be one of: ${allowedExtractionSources.join(', ')}.`,
      severity: 'error'
    });
  }

  return issues;
}
