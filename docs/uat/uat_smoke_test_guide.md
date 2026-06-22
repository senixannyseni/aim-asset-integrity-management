# UAT Smoke Test Guide

## 1. Purpose

This guide provides quick PowerShell-oriented smoke checks for the AIM UAT environment. It verifies that the API is reachable, authentication works, governance routes respond, and audit/workflow/error visibility is available. It does not replace the full UAT scripts.

## 2. Assumptions

- API base URL: `http://localhost:4000/api/v1` or the configured UAT API URL.
- No real password or secret is written in this guide.
- Use environment variables or a local `.env` file that is not committed.
- The UAT seed is optional and local/UAT only.

```powershell
$BaseUrl = "http://localhost:4000/api/v1"
$loginBody = @{
  email = "engineer.uat@example.test"
}

$loginBody["password"] = $env:AIM_UAT_PASSWORD

$login = Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/api/auth/login" `
  -ContentType "application/json" `
  -Body ($loginBody | ConvertTo-Json)
```

## 3. API Health

```powershell
Invoke-RestMethod -Method Get -Uri "$BaseUrl/health"
```

Expected: healthy response. If the route is exposed outside `/api/v1`, use the repository's configured health path.

## 4. Login Smoke Test

```powershell
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body (@{
  email = $Email
  password = $Password
} | ConvertTo-Json)

$token = $login.data.tokens.accessToken
```

Expected: access token returned. No password or token should be committed to the repository.

## 5. Auth / Me Smoke Test

```powershell
Invoke-RestMethod -Method Get -Uri "$BaseUrl/auth/me" -Headers @{ Authorization = "Bearer $token" }
```

Expected: current user and role/permission context returned.

## 6. RBAC Denied Action Smoke Test

Use a read-only or service user and attempt a restricted action such as report issue or admin-only update.

```powershell
# Example only. Use a non-privileged token in UAT.
Invoke-RestMethod -Method Post -Uri "$BaseUrl/reports/00000000-0000-0000-0000-000000000000/issue" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (@{
  comment = "UAT denied-action smoke test"
} | ConvertTo-Json)
```

Expected: unauthorized or gate-blocked result, not silent success.

## 7. Evidence Metadata Route

```powershell
Invoke-RestMethod -Method Get -Uri "$BaseUrl/evidence-files" -Headers @{ Authorization = "Bearer $token" }
```

Expected: list or empty list. If route naming differs, use OpenAPI route names in `04_API/openapi.yaml`.

## 8. Extraction Job Route

```powershell
Invoke-RestMethod -Method Get -Uri "$BaseUrl/extraction-jobs" -Headers @{ Authorization = "Bearer $token" }
```

Expected: extraction job list or permission-controlled response. AI output must remain staging-only.

## 9. Staging Review Route

```powershell
Invoke-RestMethod -Method Get -Uri "$BaseUrl/staging-records" -Headers @{ Authorization = "Bearer $token" }
```

Expected: staging records visible to authorized reviewer. Promotion must require engineer review and evidence linkage.

## 10. Calculation Route

```powershell
Invoke-RestMethod -Method Get -Uri "$BaseUrl/calculations" -Headers @{ Authorization = "Bearer $token" }
```

Expected: calculation list or route-specific read response. Calculation run must require explicit approved formula version.

## 11. Report Gate Route

```powershell
Invoke-RestMethod -Method Post -Uri "$BaseUrl/reports/38000000-0000-4000-8000-000000000001/issue" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (@{
  comment = "UAT report issue gate smoke test"
} | ConvertTo-Json)
```

Expected: issued only if gates pass; otherwise `REPORT_GATES_NOT_SATISFIED`, `REPORT_ISSUE_BLOCKED`, or equivalent gate error/audit signal.

## 12. Work Order Route

```powershell
Invoke-RestMethod -Method Get -Uri "$BaseUrl/work-orders" -Headers @{ Authorization = "Bearer $token" }
```

Expected: internal work order list. External SAP/Maximo/CMMS integration must not be invoked.

## 13. Workflow Event Route

```powershell
Invoke-RestMethod -Method Get -Uri "$BaseUrl/workflow-events" -Headers @{ Authorization = "Bearer $token" }
```

Expected: workflow events are visible to authorized IT/Admin role. n8n must call AIM APIs only.

## 14. Error Log Route

```powershell
Invoke-RestMethod -Method Get -Uri "$BaseUrl/error-logs" -Headers @{ Authorization = "Bearer $token" }
```

Expected: error logs are visible to authorized role and can be used for recovery triage.

## 15. Audit Log Read Route

```powershell
Invoke-RestMethod -Method Get -Uri "$BaseUrl/audit-logs" -Headers @{ Authorization = "Bearer $token" }
```

Expected: audit logs are read-only and permission-controlled.

## 16. Smoke Test Pass Criteria

- API health is reachable.
- Login and auth/me work.
- RBAC blocks unauthorized actions.
- Evidence, extraction, staging, calculation, report, work-order, workflow, error, and audit routes respond consistently with permissions.
- No test requires direct PostgreSQL access by n8n.
- No test invokes external SAP/Maximo/CMMS integration.
