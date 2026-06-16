export type AimRole =
  | 'admin'
  | 'data_entry'
  | 'inspector'
  | 'engineer'
  | 'senior_engineer'
  | 'qa_qc'
  | 'client_viewer'
  | 'ai_agent';

export type RecordStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'locked'
  | 'retired';

export type FormulaStatus =
  | 'draft'
  | 'under_review'
  | 'approved_active'
  | 'retired'
  | 'rejected';

export type TankOperatingStatus = 'in_service' | 'out_of_service' | 'mothballed' | 'retired';

export type TankAsset = {
  asset_id: string;
  tank_tag: string;
  asset_name: string;
  facility: string;
  location: string;
  service_fluid: string;
  tank_type: string;
  construction_year: number;
  original_design_code: string;
  current_assessment_code: string;
  code_edition: string;
  owner: string;
  operating_status: TankOperatingStatus;
  inspection_due_date: string;
  record_status: string;
};

export type TankGeometry = {
  geometry_id: string;
  asset_id: string;
  diameter: number;
  diameter_unit: 'm';
  shell_height: number;
  shell_height_unit: 'm';
  number_of_courses: number;
  design_liquid_level: number;
  design_liquid_level_unit: 'm';
  nominal_capacity: number;
  nominal_capacity_unit: 'm3';
  specific_gravity: number;
  design_temperature: number;
  design_temperature_unit: 'C';
  design_pressure: number;
  design_pressure_unit: 'kPa';
  vacuum_design_basis: string;
  bottom_type: string;
  roof_type: string;
  foundation_type: string;
  status: string;
};

export type ShellCourse = {
  shell_course_id: string;
  asset_id: string;
  course_no: number;
  course_height: number;
  course_height_unit: 'm';
  course_height_mm: number;
  nominal_thickness: number;
  nominal_thickness_unit: 'mm';
  measured_min_thickness: number;
  measured_min_thickness_unit: 'mm';
  material_id: string;
  material_code?: string;
  material_name?: string;
  material_specification: string;
  joint_efficiency: number;
  corrosion_allowance: number;
  corrosion_allowance_unit: 'mm';
  coating_lining_status: string;
  status: string;
};

export type MaterialMaster = {
  material_id: string;
  material_code: string;
  material_name: string;
  material_specification: string;
  material_family?: string;
  notes?: string;
  is_active: boolean;
};

export type ApiEnvelope<T> = {
  data: T;
  requestId: string;
  auditLogId?: string;
  mock: false;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
};

export type EvidenceFile = {
  evidence_id: string;
  evidence_code: string;
  asset_id: string;
  inspection_event_id?: string | null;
  object_storage_path: string;
  file_name: string;
  file_type: string;
  inspection_date: string;
  method: string;
  component: string;
  location?: string | null;
  page_or_sheet_ref?: string | null;
  uploaded_by?: string | null;
  checksum: string;
  status: string;
};

export type EvidenceLink = {
  evidence_link_id: string;
  evidence_file_id: string;
  linked_entity_type: 'asset' | 'inspection_event' | 'ndt_measurement' | 'calculation_run' | 'finding' | 'ffs_case' | 'rbi_case';
  linked_entity_id: string;
  link_reason: string;
  linked_by?: string | null;
  created_at: string;
};

export type NdtMeasurement = {
  measurement_id: string;
  measurement_code: string;
  asset_id: string;
  inspection_event_id?: string | null;
  component: string;
  shell_course_no?: number | null;
  cml_tml_id?: string | null;
  grid_ref?: string | null;
  elevation?: number | null;
  elevation_unit: 'm';
  orientation?: string | null;
  measured_thickness: number;
  measured_thickness_unit: 'mm';
  reading_date: string;
  method: string;
  confidence: number;
  evidence_file_id?: string | null;
  extraction_source: 'manual' | 'bulk_import' | 'ai_staging' | 'vendor_import';
  reviewer_status: 'needs_review' | 'reviewed' | 'rejected' | 'approved';
  validation_status: 'not_validated' | 'valid' | 'warning' | 'blocked';
  validation_message?: string | null;
  is_critical: boolean;
};
