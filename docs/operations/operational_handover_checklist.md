# Operational Handover Checklist

## Purpose

Define the minimum handover items before RC3 release-candidate operations begin.

## Role Handover

- [ ] Admin user handover completed: user/role/permission management, admin governance console, safe settings update boundaries.
- [ ] Engineer reviewer handover completed: AI staging review, manual correction, evidence linkage, calculation/review gates, report issue gates.
- [ ] Evidence manager handover completed: object storage evidence metadata, checksum, linkage, deletion restrictions, evidence governance rules.
- [ ] Report approver handover completed: report issue gates, approval reasons, SoD, audit requirements.
- [ ] Operations/hypercare owner handover completed: go-live readiness dashboard, workflow console, error logs, notification logs, escalation route.

## Incident and Escalation

- [ ] Incident escalation path documented.
- [ ] Severity classification agreed.
- [ ] On-call or support contact fixtures filled.
- [ ] Product Owner contact fixture filled.
- [ ] Lead Engineer contact fixture filled.
- [ ] IT Admin contact fixture filled.
- [ ] n8n/workflow support owner fixture filled.
- [ ] Support contact fields completed: name, role, email/phone/channel, escalation level, availability window, backup contact.

## Known Limitations

- [ ] API 579/API 581/FFS/RBI quantitative calculations remain out of scope.
- [ ] External CMMS/SAP/Maximo integration remains out of scope.
- [ ] AI remains assistive/staging-only and cannot approve or finalize.
- [ ] n8n remains API-only orchestration and cannot write directly to PostgreSQL.
- [ ] Any accepted release limitation has owner, impact, and mitigation.

## Training Completion Checklist

- [ ] Admin training completed.
- [ ] Inspector/evidence uploader training completed.
- [ ] Engineer reviewer training completed.
- [ ] Lead Engineer/Approver training completed.
- [ ] Management/read-only dashboard training completed.
- [ ] IT Admin/operations training completed.
- [ ] Training attendance or sign-off evidence retained.

## RC3-J operational handover validation anchors

- admin user handover
- engineer reviewer handover
- evidence manager handover
- report approver handover
- operations/hypercare owner handover
- incident escalation path
- known limitations
- support contact fixtures
- support contact fields
- training completion checklist
