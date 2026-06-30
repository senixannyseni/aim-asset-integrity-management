import { TenantContextError } from './tenant-context.js';
import {
  PRODUCTION_ROUTE_FILES,
  TENANT_ROUTE_REGISTRY,
  duplicateRouteRegistryFiles,
  routeFilesMissingFromRegistry,
  tenantControlPlaneRouteEntries,
  tenantScopedRouteEntries,
  tenantScopedRoutesWithoutBoundary,
  type TenantRouteRegistryEntry
} from './tenant-route-registry.js';

export type TenantRouteRegressionSummary = {
  registryStatus: 'pass' | 'fail';
  totalRouteFiles: number;
  mappedRouteFiles: number;
  tenantScopedRoutes: number;
  controlPlaneOrPublicRoutes: number;
  routesMissingFromRegistry: string[];
  duplicateRouteFiles: string[];
  tenantScopedRoutesWithoutBoundary: string[];
  evidenceIds: string[];
};

export function buildTenantRouteRegressionSummary(input?: {
  actualRouteFiles?: string[];
  entries?: TenantRouteRegistryEntry[];
}): TenantRouteRegressionSummary {
  const actualRouteFiles = input?.actualRouteFiles ?? PRODUCTION_ROUTE_FILES;
  const entries = input?.entries ?? TENANT_ROUTE_REGISTRY;
  const missing = routeFilesMissingFromRegistry(actualRouteFiles, entries);
  const duplicates = duplicateRouteRegistryFiles(entries);
  const unbounded = tenantScopedRoutesWithoutBoundary(entries).map((entry) => entry.routeFile).sort();
  const evidenceIds = [...new Set(entries.map((entry) => entry.evidenceId))].sort();

  return {
    registryStatus: missing.length === 0 && duplicates.length === 0 && unbounded.length === 0 ? 'pass' : 'fail',
    totalRouteFiles: actualRouteFiles.length,
    mappedRouteFiles: entries.length,
    tenantScopedRoutes: tenantScopedRouteEntries(entries).length,
    controlPlaneOrPublicRoutes: tenantControlPlaneRouteEntries(entries).length,
    routesMissingFromRegistry: missing,
    duplicateRouteFiles: duplicates,
    tenantScopedRoutesWithoutBoundary: unbounded,
    evidenceIds
  };
}

export function assertTenantRouteRegressionCoverage(input?: {
  actualRouteFiles?: string[];
  entries?: TenantRouteRegistryEntry[];
}): TenantRouteRegressionSummary {
  const summary = buildTenantRouteRegressionSummary(input);
  if (summary.registryStatus !== 'pass') {
    throw new TenantContextError(
      'TENANT_ROUTE_REGRESSION_COVERAGE_FAILED',
      `Tenant route regression coverage failed. Missing=${summary.routesMissingFromRegistry.join(',')}; duplicates=${summary.duplicateRouteFiles.join(',')}; unbounded=${summary.tenantScopedRoutesWithoutBoundary.join(',')}`,
      500
    );
  }
  return summary;
}

export function buildTenantRouteEvidenceMatrix(entries: TenantRouteRegistryEntry[] = TENANT_ROUTE_REGISTRY): Record<string, string[]> {
  return entries.reduce<Record<string, string[]>>((matrix, entry) => {
    matrix[entry.evidenceId] = [...(matrix[entry.evidenceId] ?? []), entry.routeFile].sort();
    return matrix;
  }, {});
}

export function assertTenantScopedRouteHasRuntimeBoundary(routeFile: string, entries: TenantRouteRegistryEntry[] = TENANT_ROUTE_REGISTRY): TenantRouteRegistryEntry {
  const entry = entries.find((candidate) => candidate.routeFile === routeFile);
  if (!entry) {
    throw new TenantContextError('TENANT_ROUTE_NOT_REGISTERED', `Route is not present in the tenant route registry: ${routeFile}`, 500);
  }
  if (entry.scopeStatus === 'tenant_scoped' && !['runtime_filter', 'runtime_filter_and_object_boundary'].includes(entry.boundaryMode)) {
    throw new TenantContextError('TENANT_ROUTE_BOUNDARY_REQUIRED', `Tenant-scoped route lacks a runtime tenant boundary mode: ${routeFile}`, 500);
  }
  return entry;
}
