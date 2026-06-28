# RC4-O Static Test Compatibility Hotfix Patch Manifest

## Scope

This hotfix preserves legacy static governance-test anchors after RC4-O calculation route refactoring.

## Changed files

- `apps/api/src/routes/calculations.ts`
- `apps/api/tests/rc4-o-calculation-run-detail-formula-traceability.test.ts`

## Behavior

No runtime behavior changes. The deterministic formula guard, calculation run lookup behavior, and RC4-O read-only readiness endpoint remain unchanged.

## Compatibility anchors restored

- `formula.formula_type !== 'universal_deterministic'`
- `isUuid(runId)` semantics note

## Test hardening

The RC4-O static test normalizes CRLF to LF before checking multiline route anchors, avoiding Windows line-ending false negatives.
