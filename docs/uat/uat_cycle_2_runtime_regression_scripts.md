# UAT Cycle 2 Runtime Regression Scripts

These scripts must be run against the AIM API after RC2 hardening. Replace IDs with seeded/runtime values.

## 1. Login and token path

Use the real token path:

```powershell
$login = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/auth/login" -ContentType "application/json" -Body (@{ email = "engineer@aim.local"; password = $env:AIM_UAT_PASSWORD } | ConvertTo-Json)
$token = $login.data.accessToken
```

Do not use `$login.data.tokens.accessToken`.

## 2. NDT invalid extraction_source controlled 400

```powershell
try {
  Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/ndt/measurements" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (@{
    asset_id = $assetId
    component = "SHELL_COURSE_1"
    measured_thickness = 7.2
    reading_date = "2026-06-23"
    method = "UT_THICKNESS"
    extraction_source = "manual_uat"
  } | ConvertTo-Json) -ErrorAction Stop
  throw "Expected controlled 400 validation."
} catch {
  $_.Exception.Response.StatusCode.value__
}
```

Expected: 400 with field `extraction_source`.

## 3. Integrity decision evidence gate

1. Create integrity decision from approved calculation.
2. Attempt approval before evidence link.
3. Expected: `409 INTEGRITY_DECISION_EVIDENCE_REQUIRED`.
4. Link evidence directly:

```powershell
Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/evidence/$evidenceId/links" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (@{
  linked_entity_type = "integrity_decision"
  linked_entity_id = $integrityDecisionId
  link_reason = "UAT Cycle 2 direct evidence link."
} | ConvertTo-Json)
```

5. Senior approval should now pass.

AI must not approve at any point.

## 4. Report per-entity evidence gates

Before final issue, link evidence directly to all three:

```powershell
@(
  @{ linked_entity_type = "calculation_run"; linked_entity_id = $calculationRunId },
  @{ linked_entity_type = "integrity_decision"; linked_entity_id = $integrityDecisionId },
  @{ linked_entity_type = "report"; linked_entity_id = $reportId }
) | ForEach-Object {
  Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/evidence/$evidenceId/links" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (@{
    linked_entity_type = $_.linked_entity_type
    linked_entity_id = $_.linked_entity_id
    link_reason = "UAT Cycle 2 report issue per-entity evidence gate."
  } | ConvertTo-Json)
}
```

Report issue should be blocked if any one of these direct links is missing.

## 5. FFS/RBI UUID/text lookup

Create FFS/RBI cases from both UUID `calculation_run_id` and text `run_id` where supported. Invalid identifiers must return controlled 404/400, not `operator does not exist: text = uuid`.

## 6. Work order fallback

- External CMMS reference must be rejected.
- Internal AIM work order must be created from issued report.
- Engineer close attempt should be denied without `work_order.close`.
- Senior/admin close should pass if closure evidence is not required.

n8n must remain orchestration-only and must not write directly to PostgreSQL.
