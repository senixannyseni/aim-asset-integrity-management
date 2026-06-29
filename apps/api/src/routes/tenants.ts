import { Router, type Response } from 'express';
import { requirePermission } from '../middleware/rbac.js';

export const tenantsRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;

tenantsRouter.get('/tenant/context', requirePermission('tenant.context.read'), (req, res: ApiResponse) => {
  if (!req.tenant) {
    res.status(400).json({
      error: {
        code: 'TENANT_CONTEXT_REQUIRED',
        message: 'Tenant context is required for tenant-aware runtime operations.'
      }
    });
    return;
  }

  res.json({
    tenant_context: req.tenant,
    available_tenants: req.user?.tenantMemberships.map((membership) => ({
      tenant_id: membership.tenantId,
      tenant_slug: membership.tenantSlug,
      tenant_name: membership.tenantName,
      status: membership.status,
      is_default: membership.isDefault
    })) ?? [],
    governance: {
      aim_system_of_record: true,
      n8n_orchestration_only: true,
      human_approval_required: true,
      service_actor_boundary: 'AI/n8n/service actors cannot approve tenant context or tenant isolation readiness.'
    }
  });
});

tenantsRouter.get('/tenant/isolation-health', requirePermission('tenant.context.read'), (req, res: ApiResponse) => {
  if (!req.tenant) {
    res.status(400).json({
      error: {
        code: 'TENANT_CONTEXT_REQUIRED',
        message: 'Tenant context is required for tenant isolation health checks.'
      }
    });
    return;
  }

  res.json({
    tenant_id: req.tenant.tenantId,
    tenant_slug: req.tenant.tenantSlug,
    isolation_controls: [
      'tenant_id is resolved from authenticated user membership before tenant-aware routes execute',
      'tenant_id request headers can only select a tenant already available to the authenticated user',
      'tenant-scoped database records must be filtered by tenant_id in Sprint 2+ route implementation',
      'AI/n8n/service actors cannot approve tenant isolation readiness'
    ],
    n8n_boundary: 'n8n remains orchestration-only',
    system_of_record: 'AIM remains the system of record'
  });
});
