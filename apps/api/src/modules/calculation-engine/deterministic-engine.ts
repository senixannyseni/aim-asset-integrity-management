import { createHash } from 'node:crypto';
import { validateEngineeringContext, type ValidationContext, type ValidationEngineResult } from '../engineering-validation/validation-engine.js';

export type CalculationSeverity = 'info' | 'warning' | 'blocking';

export type CalculationWarning = {
  code: string;
  severity: CalculationSeverity;
  message: string;
  field_name?: string;
  suggested_action: string;
};

export type NormalizedMeasurement = {
  measurement_id: string;
  component: string;
  shell_course_no: number | null;
  cml_tml_id: string | null;
  grid_ref: string | null;
  elevation_m: number | null;
  orientation: string | null;
  measured_thickness_mm: number;
  reading_date: string;
  method: string | null;
  evidence_file_id: string | null;
  is_critical: boolean;
};

export type CorrosionRateResult = {
  group_key: string;
  component: string;
  shell_course_no: number | null;
  cml_tml_id: string | null;
  grid_ref: string | null;
  oldest_thickness_mm: number;
  latest_thickness_mm: number;
  oldest_reading_date: string;
  latest_reading_date: string;
  elapsed_years: number;
  corrosion_rate_mm_per_year: number;
};

export type RemainingLifeResult = {
  group_key: string;
  latest_thickness_mm: number;
  retirement_thickness_mm: number;
  corrosion_rate_mm_per_year: number;
  remaining_life_years: number | null;
  status: 'pass' | 'fail' | 'not_determined';
};

export type DeterministicCalculationRequest = ValidationContext & {
  calculation_scope?: 'thickness_screening' | 'corrosion_rate' | 'remaining_life' | 'inspection_interval_placeholder';
  calculation_request?: Record<string, unknown> | null;
  thresholds?: Record<string, unknown> | null;
};

export type DeterministicCalculationResult = {
  deterministic_engine_version: 'AIM-DETERMINISTIC-CALC-V1';
  input_snapshot_hash: string;
  validation_result: ValidationEngineResult;
  validation_status: 'passed' | 'blocked';
  normalized_inputs: Record<string, unknown>;
  output_summary: {
    calculation_scope: string;
    measurement_count: number;
    corrosion_rate_count: number;
    remaining_life_count: number;
    warning_count: number;
    ffs_trigger_candidate: boolean;
    rbi_trigger_candidate: boolean;
    next_inspection_interval_years: number | null;
  };
  corrosion_rates: CorrosionRateResult[];
  remaining_life: RemainingLifeResult[];
  warnings: CalculationWarning[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    if (lowered === 'true') return true;
    if (lowered === 'false') return false;
  }
  return undefined;
}

function valueAt(record: Record<string, unknown> | undefined | null, keys: string[]): unknown {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function round(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function stableSortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSortObject);
  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableSortObject(value[key]);
        return acc;
      }, {});
  }
  return value;
}

export function hashInputSnapshot(value: unknown): string {
  const canonical = JSON.stringify(stableSortObject(value));
  return createHash('sha256').update(canonical).digest('hex');
}

export function normalizeThicknessToMm(value: unknown, unitValue: unknown): number | undefined {
  const raw = asNumber(value);
  if (raw === undefined) return undefined;
  const unit = (asString(unitValue) ?? 'mm').toLowerCase();
  if (unit === 'mm' || unit === 'millimeter' || unit === 'millimeters') return round(raw, 6);
  if (unit === 'm' || unit === 'meter' || unit === 'meters') return round(raw * 1000, 6);
  if (unit === 'cm' || unit === 'centimeter' || unit === 'centimeters') return round(raw * 10, 6);
  if (unit === 'inch' || unit === 'in' || unit === 'inches') return round(raw * 25.4, 6);
  return undefined;
}

function normalizeLengthToMeters(value: unknown, unitValue: unknown): number | null {
  const raw = asNumber(value);
  if (raw === undefined) return null;
  const unit = (asString(unitValue) ?? 'm').toLowerCase();
  if (unit === 'm' || unit === 'meter' || unit === 'meters') return round(raw, 6);
  if (unit === 'mm' || unit === 'millimeter' || unit === 'millimeters') return round(raw / 1000, 6);
  if (unit === 'cm' || unit === 'centimeter' || unit === 'centimeters') return round(raw / 100, 6);
  if (unit === 'ft' || unit === 'feet' || unit === 'foot') return round(raw * 0.3048, 6);
  return null;
}

function normalizedMeasurementFrom(record: Record<string, unknown>, index: number): NormalizedMeasurement | undefined {
  const thickness = normalizeThicknessToMm(valueAt(record, ['measured_thickness_mm', 'measured_thickness']), valueAt(record, ['measured_thickness_unit', 'thickness_unit']));
  const readingDate = asString(valueAt(record, ['reading_date', 'inspection_date']));
  const component = asString(valueAt(record, ['component'])) ?? 'unknown_component';
  if (thickness === undefined || !readingDate) return undefined;
  return {
    measurement_id: asString(valueAt(record, ['measurement_id', 'id'])) ?? `input-ndt-${index + 1}`,
    component,
    shell_course_no: asNumber(valueAt(record, ['shell_course_no'])) ?? null,
    cml_tml_id: asString(valueAt(record, ['cml_tml_id'])) ?? null,
    grid_ref: asString(valueAt(record, ['grid_ref'])) ?? null,
    elevation_m: normalizeLengthToMeters(valueAt(record, ['elevation_m', 'elevation']), valueAt(record, ['elevation_unit'])) ?? null,
    orientation: asString(valueAt(record, ['orientation'])) ?? null,
    measured_thickness_mm: thickness,
    reading_date: readingDate,
    method: asString(valueAt(record, ['method'])) ?? null,
    evidence_file_id: asString(valueAt(record, ['evidence_file_id'])) ?? null,
    is_critical: asBoolean(valueAt(record, ['is_critical'])) ?? true
  };
}

function measurementGroupKey(measurement: NormalizedMeasurement): string {
  return [
    measurement.component,
    measurement.shell_course_no ?? 'course_unknown',
    measurement.cml_tml_id ?? 'cml_unknown',
    measurement.grid_ref ?? 'grid_unknown',
    measurement.elevation_m ?? 'elevation_unknown',
    measurement.orientation ?? 'orientation_unknown'
  ].join('|');
}

function yearsBetween(oldestDate: string, latestDate: string): number {
  const oldest = new Date(`${oldestDate}T00:00:00.000Z`).getTime();
  const latest = new Date(`${latestDate}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(oldest) || !Number.isFinite(latest) || latest <= oldest) return 0;
  return (latest - oldest) / (365.25 * 24 * 60 * 60 * 1000);
}

export function calculateCorrosionRates(measurements: NormalizedMeasurement[]): CorrosionRateResult[] {
  const groups = measurements.reduce<Map<string, NormalizedMeasurement[]>>((acc, measurement) => {
    const key = measurementGroupKey(measurement);
    const existing = acc.get(key) ?? [];
    existing.push(measurement);
    acc.set(key, existing);
    return acc;
  }, new Map<string, NormalizedMeasurement[]>());

  return Array.from(groups.entries())
    .map(([groupKey, group]) => {
      const sorted = [...group].sort((a, b) => a.reading_date.localeCompare(b.reading_date) || a.measurement_id.localeCompare(b.measurement_id));
      if (sorted.length < 2) return undefined;
      const oldest = sorted[0];
      const latest = sorted[sorted.length - 1];
      if (!oldest || !latest) return undefined;
      const elapsedYears = yearsBetween(oldest.reading_date, latest.reading_date);
      if (elapsedYears <= 0) return undefined;
      const loss = oldest.measured_thickness_mm - latest.measured_thickness_mm;
      const rate = Math.max(0, loss / elapsedYears);
      return {
        group_key: groupKey,
        component: latest.component,
        shell_course_no: latest.shell_course_no,
        cml_tml_id: latest.cml_tml_id,
        grid_ref: latest.grid_ref,
        oldest_thickness_mm: oldest.measured_thickness_mm,
        latest_thickness_mm: latest.measured_thickness_mm,
        oldest_reading_date: oldest.reading_date,
        latest_reading_date: latest.reading_date,
        elapsed_years: round(elapsedYears, 6),
        corrosion_rate_mm_per_year: round(rate, 6)
      } satisfies CorrosionRateResult;
    })
    .filter((result): result is CorrosionRateResult => result !== undefined)
    .sort((a, b) => a.group_key.localeCompare(b.group_key));
}

function findRetirementThickness(context: DeterministicCalculationRequest, rate: CorrosionRateResult): number | undefined {
  const calculationRequest = isRecord(context.calculation_request) ? context.calculation_request : {};
  const direct = normalizeThicknessToMm(
    valueAt(calculationRequest, ['retirement_thickness_mm', 'selected_retirement_thickness', 'retirement_thickness']),
    valueAt(calculationRequest, ['retirement_thickness_unit'])
  );
  if (direct !== undefined) return direct;

  const controlledOutput = isRecord(calculationRequest.controlled_formula_output) ? calculationRequest.controlled_formula_output : undefined;
  const controlled = normalizeThicknessToMm(valueAt(controlledOutput, ['retirement_thickness_mm', 'retirement_thickness']), valueAt(controlledOutput, ['retirement_thickness_unit']));
  if (controlled !== undefined) return controlled;

  const courses = context.shell_courses ?? [];
  const matched = courses.find((course) => {
    const courseNo = asNumber(valueAt(course, ['course_no', 'shell_course_no']));
    return courseNo !== undefined && rate.shell_course_no !== null && courseNo === rate.shell_course_no;
  });
  return normalizeThicknessToMm(valueAt(matched, ['minimum_required_thickness_mm', 'minimum_required_thickness']), valueAt(matched, ['minimum_required_thickness_unit']));
}

export function calculateRemainingLife(context: DeterministicCalculationRequest, rates: CorrosionRateResult[]): RemainingLifeResult[] {
  return rates.map((rate) => {
    const retirementThickness = findRetirementThickness(context, rate);
    if (retirementThickness === undefined) {
      return {
        group_key: rate.group_key,
        latest_thickness_mm: rate.latest_thickness_mm,
        retirement_thickness_mm: 0,
        corrosion_rate_mm_per_year: rate.corrosion_rate_mm_per_year,
        remaining_life_years: null,
        status: 'not_determined'
      } satisfies RemainingLifeResult;
    }
    if (rate.latest_thickness_mm < retirementThickness) {
      return {
        group_key: rate.group_key,
        latest_thickness_mm: rate.latest_thickness_mm,
        retirement_thickness_mm: retirementThickness,
        corrosion_rate_mm_per_year: rate.corrosion_rate_mm_per_year,
        remaining_life_years: 0,
        status: 'fail'
      } satisfies RemainingLifeResult;
    }
    const remainingLife = rate.corrosion_rate_mm_per_year > 0 ? (rate.latest_thickness_mm - retirementThickness) / rate.corrosion_rate_mm_per_year : null;
    return {
      group_key: rate.group_key,
      latest_thickness_mm: rate.latest_thickness_mm,
      retirement_thickness_mm: retirementThickness,
      corrosion_rate_mm_per_year: rate.corrosion_rate_mm_per_year,
      remaining_life_years: remainingLife === null ? null : round(remainingLife, 6),
      status: remainingLife === null ? 'not_determined' : 'pass'
    } satisfies RemainingLifeResult;
  });
}

function evidenceLinkExistsForMeasurement(measurement: NormalizedMeasurement, evidenceLinks: Array<Record<string, unknown>>): boolean {
  if (measurement.evidence_file_id) return true;
  return evidenceLinks.some((link) => {
    return asString(link.linked_entity_type) === 'ndt_measurement'
      && asString(link.linked_entity_id) === measurement.measurement_id
      && asString(link.evidence_file_id) !== undefined;
  });
}

function buildWarnings(
  measurements: NormalizedMeasurement[],
  rates: CorrosionRateResult[],
  remainingLife: RemainingLifeResult[],
  context: DeterministicCalculationRequest
): CalculationWarning[] {
  const calculationRequest = isRecord(context.calculation_request) ? context.calculation_request : {};
  const thresholds = isRecord(context.thresholds) ? context.thresholds : {};
  const highCorrosionRateThreshold = asNumber(valueAt(thresholds, ['high_corrosion_rate_mm_per_year'])) ?? 0.5;
  const lowRemainingLifeThreshold = asNumber(valueAt(thresholds, ['low_remaining_life_years'])) ?? 5;
  const evidenceLinks = context.evidence_links ?? [];
  const warnings: CalculationWarning[] = [];

  for (const measurement of measurements) {
    if (!evidenceLinkExistsForMeasurement(measurement, evidenceLinks)) {
      warnings.push({
        code: 'MISSING_EVIDENCE',
        severity: measurement.is_critical ? 'blocking' : 'warning',
        field_name: measurement.measurement_id,
        message: 'NDT measurement has no direct or linked evidence.',
        suggested_action: 'Attach an evidence_file_id or evidence_links record before review or approval.'
      });
    }
  }

  for (const life of remainingLife) {
    if (life.status === 'fail') {
      warnings.push({
        code: 'BELOW_REQUIRED_THICKNESS',
        severity: 'blocking',
        field_name: life.group_key,
        message: 'Latest measured thickness is below the selected retirement/required thickness.',
        suggested_action: 'Trigger engineering review and evaluate FFS candidacy using approved Formula Registry and licensed engineering basis.'
      });
    }
    if (life.remaining_life_years !== null && life.remaining_life_years < lowRemainingLifeThreshold) {
      warnings.push({
        code: 'LOW_REMAINING_LIFE',
        severity: 'warning',
        field_name: life.group_key,
        message: 'Remaining life is below the configured threshold.',
        suggested_action: 'Review inspection interval and consider FFS/RBI workflow trigger.'
      });
    }
  }

  for (const rate of rates) {
    if (rate.corrosion_rate_mm_per_year > highCorrosionRateThreshold) {
      warnings.push({
        code: 'HIGH_CORROSION_RATE',
        severity: 'warning',
        field_name: rate.group_key,
        message: 'Corrosion rate is above the configured high-rate threshold.',
        suggested_action: 'Review corrosion mechanism, evidence quality, and RBI trigger candidacy.'
      });
    }
  }

  const ffsRequested = asBoolean(calculationRequest.ffs_trigger_evaluation_requested) ?? true;
  if (ffsRequested && warnings.some((warning) => ['BELOW_REQUIRED_THICKNESS', 'LOW_REMAINING_LIFE'].includes(warning.code))) {
    warnings.push({
      code: 'FFS_TRIGGER_CANDIDATE',
      severity: 'warning',
      message: 'Calculation output indicates possible FFS trigger candidate.',
      suggested_action: 'Open FFS trigger workflow; do not make final FFS decision without approved API 579-1/ASME FFS-1 workflow.'
    });
  }

  const rbiRequested = asBoolean(calculationRequest.rbi_trigger_evaluation_requested) ?? true;
  if (rbiRequested && warnings.some((warning) => ['HIGH_CORROSION_RATE', 'MISSING_EVIDENCE'].includes(warning.code))) {
    warnings.push({
      code: 'RBI_TRIGGER_CANDIDATE',
      severity: 'warning',
      message: 'Calculation output indicates possible RBI trigger candidate.',
      suggested_action: 'Route to RBI interface for API RP 580/581 evaluation using controlled data only.'
    });
  }

  return warnings;
}

function nextInspectionInterval(remainingLife: RemainingLifeResult[]): number | null {
  const finiteLives = remainingLife
    .map((item) => item.remaining_life_years)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0);
  if (finiteLives.length === 0) return 5;
  const minimum = Math.min(...finiteLives);
  if (minimum <= 0) return 0.5;
  return round(Math.min(5, Math.max(0.5, minimum / 2)), 3);
}

export function runDeterministicCalculation(context: DeterministicCalculationRequest): DeterministicCalculationResult {
  const normalizedScope = context.calculation_scope ?? 'thickness_screening';
  const validationContext: ValidationContext = {
    ...context,
    validation_scope: context.validation_scope ?? 'calculation_readiness',
    calculation_request: {
      ...(isRecord(context.calculation_request) ? context.calculation_request : {}),
      thickness_check_requested: true
    }
  };
  const validationResult = validateEngineeringContext(validationContext);
  const inputSnapshotHash = hashInputSnapshot(context);

  if (!validationResult.ok) {
    return {
      deterministic_engine_version: 'AIM-DETERMINISTIC-CALC-V1',
      input_snapshot_hash: inputSnapshotHash,
      validation_result: validationResult,
      validation_status: 'blocked',
      normalized_inputs: { ndt_measurements: [] },
      output_summary: {
        calculation_scope: normalizedScope,
        measurement_count: 0,
        corrosion_rate_count: 0,
        remaining_life_count: 0,
        warning_count: 0,
        ffs_trigger_candidate: false,
        rbi_trigger_candidate: false,
        next_inspection_interval_years: null
      },
      corrosion_rates: [],
      remaining_life: [],
      warnings: []
    };
  }

  const measurements = (context.ndt_measurements ?? [])
    .map((measurement, index) => normalizedMeasurementFrom(measurement, index))
    .filter((measurement): measurement is NormalizedMeasurement => measurement !== undefined);
  const rates = calculateCorrosionRates(measurements);
  const remainingLife = calculateRemainingLife(context, rates);
  const warnings = buildWarnings(measurements, rates, remainingLife, context);
  const nextInspection = nextInspectionInterval(remainingLife);
  return {
    deterministic_engine_version: 'AIM-DETERMINISTIC-CALC-V1',
    input_snapshot_hash: inputSnapshotHash,
    validation_result: validationResult,
    validation_status: 'passed',
    normalized_inputs: { ndt_measurements: measurements },
    output_summary: {
      calculation_scope: normalizedScope,
      measurement_count: measurements.length,
      corrosion_rate_count: rates.length,
      remaining_life_count: remainingLife.length,
      warning_count: warnings.length,
      ffs_trigger_candidate: warnings.some((warning) => warning.code === 'FFS_TRIGGER_CANDIDATE'),
      rbi_trigger_candidate: warnings.some((warning) => warning.code === 'RBI_TRIGGER_CANDIDATE'),
      next_inspection_interval_years: nextInspection
    },
    corrosion_rates: rates,
    remaining_life: remainingLife,
    warnings
  };
}
