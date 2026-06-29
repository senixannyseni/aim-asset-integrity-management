# P5-6 External CMMS and Notification Readiness Record

**Record:** P5-6 External CMMS and Notification Readiness Record  
**Evidence IDs:** P5-INT-005, P5-INT-006, P5-INT-010  
**Status:** Template/evidence-control record; actual evidence must be attached by named humans

## 1. External CMMS Readiness Decision

External CMMS integration is not assumed ready by default. Internal work-order fallback remains the controlled path unless a named human cutover decision records the target CMMS, mapping, authentication boundary, audit linkage, rollback path, and no-go criteria.

Required evidence:

- CMMS system owner and integration owner;
- field mapping from AIM internal work order to external CMMS work order;
- outbound/inbound payload ownership;
- authentication and service-account owner;
- sandbox endpoint evidence using redacted placeholders only;
- cutover/no-cutover decision;
- rollback to internal work-order fallback procedure;
- human approval for external CMMS cutover.

AI/n8n/service actors cannot approve external CMMS cutover. AI/n8n/service actors cannot accept integration evidence.

## 2. Internal Work-Order Fallback

Until external CMMS cutover is approved, AIM internal work-order fallback remains active and governed. Integration readiness must not weaken report issue gates, work-order closure gates, evidence linkage, audit logs, or segregation-of-duty controls.

Required evidence:

- internal work-order fallback owner;
- fallback operating procedure;
- evidence/audit linkage check;
- CMMS cutover rollback owner;
- failed-export handling rule.

## 3. Notification and Webhook Routing Readiness

Notification/webhook routing must reach named humans without exposing sensitive evidence. Redacted placeholders must be used for webhook URLs, notification tokens, channel identifiers, object keys, and signed URL examples.

Required evidence:

- notification channel inventory;
- webhook endpoint inventory using redacted placeholders;
- routing owner;
- retry/escalation owner;
- redaction rule for message body and logs;
- incident route for failed notification delivery;
- sandbox/test evidence using approved non-sensitive data.

## 4. Sandbox and Test-Data Validation

| Validation item | Required evidence | Owner | Result |
|---|---|---|---|
| External endpoint uses sandbox or approved test target | Endpoint summary with redacted URL | Lead Engineer / DevOps | TBD |
| Test payload contains no confidential evidence | Test-data approval | Product Owner / Security Owner | TBD |
| Notification payload is redacted | Sample redacted payload summary | Operations / Security Owner | TBD |
| CMMS fallback can be used if integration fails | Fallback procedure evidence | Product Owner | TBD |

## 5. Human Review

AI/n8n/service actors cannot close integration gaps. AI/n8n/service actors cannot approve integration readiness. Named humans must accept external integration and notification readiness evidence before any production or production-pilot integration cutover.
