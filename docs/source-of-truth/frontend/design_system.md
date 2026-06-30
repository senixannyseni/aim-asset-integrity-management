# AIM MVP Mini Design System

**Document path:** `08_Frontend/design_system.md`  
**Product:** Asset Integrity Management (AIM) + n8n MVP  
**Purpose:** Provide a consistent visual, interaction, and governance design baseline for frontend implementation.  
**Status:** Implementation-ready baseline  
**Last updated:** 2026-06-11

---

## 0. Pre-Implementation Governance Check

### Assumptions
- AIM frontend is a professional engineering application for asset integrity workflows.
- UI must emphasize clarity, auditability, evidence traceability, review gates, and safe decision-making.
- Design must support desktop-first engineering workflows with responsive behavior for tablets.
- Color, badge, and action states must not mislead users into treating unreviewed AI/calculation outputs as final.

### Impacted Documents
- `08_Frontend/page_specs.md`
- `08_Frontend/component_inventory.md`
- `04_API/openapi.yaml`
- `06_Evidence/evidence_governance.md`
- `07_Calculation/engineering_basis.md`

### Impacted Tables
No direct table impact. Design patterns affect representation of statuses from:
- `assets`, `inspections`, `evidence_files`, `extraction_fields`, `staging_records`, `ndt_measurements`, `calculation_runs`, `integrity_decisions`, `reports`, `internal_work_orders`, `workflow_events`, `error_logs`, `audit_logs`.

### Impacted Endpoints
No direct endpoint changes. UI states are driven by API responses from all AIM modules.

### Required Permissions
Design patterns must support hidden, disabled, and read-only states for permission-restricted actions.

### Required Audit Events
Approval/action patterns must visually prompt for comments/reasons where backend audit events are required.

### Required Validation Rules
Validation states must distinguish:
- user-correctable input error,
- backend gate failure,
- permission restriction,
- workflow/system error,
- engineering review required.

### Required Test Cases
- Color contrast and keyboard navigation.
- Disabled action with reason tooltip.
- Approval modal requires comment.
- Evidence preview fallback.
- Status badges render consistently across modules.
- Error states do not expose sensitive stack traces.

### Migration or Documentation Updates
No migration required. Update this file if visual tokens, action hierarchy, or status semantics change.

---

# 1. Design Principles

## 1.1 Engineering Trust First
The interface must make it obvious which data is draft, AI-extracted, reviewed, approved, blocked, or issued. No visual treatment may imply final engineering validity before mandatory human approval.

## 1.2 Evidence-Centered Workflow
Evidence preview and evidence linkage must be available wherever engineering conclusions, NDT values, calculations, integrity decisions, or reports are reviewed.

## 1.3 Auditability by Design
Every critical page must provide an audit drawer. Approval and rejection modals must collect a comment/reason and show the impacted record.

## 1.4 Calm Professional Interface
Use a clean, enterprise-grade visual language: navy for structure, teal for primary action, gray for surfaces, warning for review attention, danger for blocking/high-risk, and success for approved/completed states.

## 1.5 Safe Automation
AI and workflow automation outputs must be visually labelled as assistive/staging, not authoritative final decisions.

---

# 2. Color Palette

## 2.1 Core Palette

| Token | Purpose | Hex | Usage |
|---|---|---:|---|
| `navy.900` | Primary navigation / header | `#0B1F33` | Sidebar, top bar, critical headings |
| `navy.800` | Strong text / panels | `#12314F` | Section headers, selected nav |
| `navy.700` | Secondary structure | `#1D466B` | Charts, dark accents |
| `teal.700` | Primary action | `#0F766E` | Primary buttons, active states |
| `teal.600` | Hover primary | `#0D9488` | Hover/focus accent |
| `teal.100` | Light primary background | `#CCFBF1` | Subtle selected backgrounds |
| `gray.950` | Main text | `#111827` | Body text |
| `gray.700` | Secondary text | `#374151` | Metadata labels |
| `gray.500` | Muted text | `#6B7280` | Helper text, timestamps |
| `gray.200` | Borders | `#E5E7EB` | Table borders, card dividers |
| `gray.100` | Page background | `#F3F4F6` | App background |
| `gray.50` | Card background | `#F9FAFB` | Cards, form surfaces |
| `warning.600` | Warning | `#D97706` | Low confidence, due soon, caution |
| `warning.100` | Warning background | `#FEF3C7` | Warning badge background |
| `danger.600` | Danger/blocking | `#DC2626` | Rejected, failed, blocked, critical |
| `danger.100` | Danger background | `#FEE2E2` | Error badge background |
| `success.600` | Success/approved | `#16A34A` | Approved, completed, pass |
| `success.100` | Success background | `#DCFCE7` | Success badge background |

## 2.2 Semantic Color Rules

| Semantic State | Foreground | Background | Rule |
|---|---|---|---|
| Approved / completed | `success.600` | `success.100` | Use only after backend-approved status |
| Pending review | `warning.600` | `warning.100` | Human action required |
| Rejected / failed / blocked | `danger.600` | `danger.100` | Blocking condition or error |
| Draft / neutral | `gray.700` | `gray.100` | No approval yet |
| AI extracted / staging | `teal.700` | `teal.100` | Assistive, not final |
| Issued report | `navy.900` | `gray.100` | Formal issued artifact |

## 2.3 Accessibility
- Minimum contrast target: WCAG AA.
- Do not rely on color only; pair color with text and icon.
- Focus ring should use teal and be visible on all backgrounds.

---

# 3. Typography

## 3.1 Font Stack

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

## 3.2 Type Scale

| Token | Size | Weight | Usage |
|---|---:|---:|---|
| `text.display` | 32px | 700 | Dashboard hero title only |
| `text.h1` | 28px | 700 | Page title |
| `text.h2` | 22px | 700 | Major section title |
| `text.h3` | 18px | 600 | Card title, form section |
| `text.body` | 14px | 400 | Default UI text |
| `text.bodyStrong` | 14px | 600 | Labels and important values |
| `text.small` | 12px | 400 | Metadata, helper text |
| `text.code` | 13px | 500 | IDs, evidence codes, record numbers |

## 3.3 Typography Rules
- Use uppercase sparingly for small metadata labels only.
- Use monospace styling only for IDs, object paths, checksums, and API/error codes.
- Long engineering descriptions should use readable line height of 1.5–1.6.

---

# 4. Layout and Spacing

## 4.1 Grid
- Desktop app content max width: fluid, with 24px page padding.
- Card spacing: 16px internal padding for compact cards, 24px for primary panels.
- Table pages use full-width layout.
- Detail pages use a two-column layout where useful:
  - left/main: engineering data,
  - right/sidebar: status, evidence, audit, gates.

## 4.2 Spacing Tokens

| Token | Value | Usage |
|---|---:|---|
| `space.1` | 4px | Icon/text gap |
| `space.2` | 8px | Compact gaps |
| `space.3` | 12px | Form field gap |
| `space.4` | 16px | Card inner spacing |
| `space.6` | 24px | Section spacing |
| `space.8` | 32px | Page section gap |

## 4.3 Border Radius

| Token | Value | Usage |
|---|---:|---|
| `radius.sm` | 4px | Inputs, small badges |
| `radius.md` | 8px | Buttons, cards, table containers |
| `radius.lg` | 12px | Modals and drawers |

---

# 5. Button Hierarchy

## 5.1 Button Types

| Type | Visual | Usage |
|---|---|---|
| Primary | teal background, white text | Main create/submit/run action |
| Secondary | white background, gray border | Non-critical navigation/action |
| Tertiary | text button | Inline low-risk action |
| Danger | danger background or outline | Reject, block, delete request |
| Success | success background | Final approve only when gates pass |
| Disabled | gray background, muted text | No permission or gate failed |

## 5.2 Button Rules
- Only one primary button per page header.
- Approval buttons must not appear without visible record status and gate status.
- Disabled buttons must show tooltip reason, e.g. “Evidence link required before approval.”
- Destructive actions require confirmation modal.
- Report issue is not a normal submit action; use approval pattern with final gate checklist.

## 5.3 Critical Action Copy

| Action | Button Label | Confirmation Required |
|---|---|---|
| Approve asset | Approve Asset | Yes |
| Submit inspection | Submit for Review | Yes |
| Approve extraction field | Approve Field | No for single field, yes for bulk |
| Promote staging | Promote Reviewed Data | Yes |
| Run calculation | Run Calculation | Yes if inputs are selected |
| Approve calculation | Approve Calculation | Yes |
| Create decision | Create Decision | Yes |
| Issue report | Issue Report | Yes, final confirmation |
| Close work order | Close Work Order | Yes |

---

# 6. Badge Style

## 6.1 Badge Anatomy
- Rounded pill or compact rectangle.
- Small icon optional.
- Text must be explicit: `Approved`, `Pending Review`, `Blocked`, not just icons.
- Tooltip explains status and next action.

## 6.2 Badge Mapping

| Status | Badge Color | Label |
|---|---|---|
| `draft` | gray | Draft |
| `pending_review` | warning | Pending Review |
| `needs_correction` | warning | Needs Correction |
| `approved` | success | Approved |
| `rejected` | danger | Rejected |
| `blocked` | danger | Blocked |
| `issued` | navy | Issued |
| `closed` | gray/navy | Closed |
| `failed` | danger | Failed |
| `low_confidence` | warning | Low Confidence |
| `staging` | teal | Staging |

## 6.3 AI Badge Rule
AI-extracted data must use `staging` or `low_confidence` style and must never use success/approved unless reviewed by an authorized human.

---

# 7. Table Style

## 7.1 Table Layout
- Header background: `gray.50`.
- Border: `gray.200`.
- Row height: 44–52px.
- Sticky header for long tables.
- Pagination at bottom right.
- Filter bar above table.
- Selected row background: `teal.100` with subtle border.

## 7.2 Required Table Features
- Loading skeleton.
- Empty state.
- Error state.
- Server-side pagination.
- Column sorting where supported.
- Row action menu with permission-aware actions.
- ID fields use `text.code` style.

## 7.3 Engineering Table Rules
- Numeric units must be visible in column header, e.g. `Current Thickness (mm)`.
- Warning values must show tooltip and warning badge.
- Evidence-linked rows must show evidence icon and code.
- Approved/final rows must show reviewer or approval timestamp where relevant.

---

# 8. Form Style

## 8.1 Form Layout
- Use sectioned forms for engineering data.
- Required fields marked with `*` and backend validation reflected inline.
- Unit suffixes must be attached to numeric fields.
- Date fields use consistent ISO display and localized date helper text where appropriate.

## 8.2 Field States

| State | Visual | Rule |
|---|---|---|
| Default | white background, gray border | Editable |
| Focus | teal ring | Keyboard accessible |
| Error | danger border and helper text | Validation failed |
| Warning | warning border/helper text | Suspicious but not always blocking |
| Disabled | gray background | No permission/status locked |
| Read-only | borderless or muted surface | Approved/issued immutable data |

## 8.3 Validation Messaging
- Use field-level messages for user-correctable input.
- Use top-level gate checklist for dependency/blocking errors.
- Backend validation messages should be preserved and mapped to fields where possible.

## 8.4 Engineering Numeric Inputs
- Always show unit.
- Reject ambiguous units.
- Use decimal precision consistent with backend validation.
- Suspicious thickness values must show warning and require review.

---

# 9. Modal Style

## 9.1 Modal Usage
Use modals for:
- approval,
- rejection,
- request correction,
- report issue,
- metadata correction,
- work order closure,
- deletion request.

Avoid modal use for long data-entry forms unless necessary.

## 9.2 Modal Anatomy
- Title: action + record identifier.
- Context summary: record type, asset tag, status.
- Gate checklist if action is approval or issue.
- Required comment/reason field.
- Primary action button.
- Cancel button.

## 9.3 Critical Modal Rules
- Approval/rejection comments required for auditable actions.
- Destructive or final actions use explicit confirmation checkbox.
- Report issue modal must show final gate checklist and “issued reports are versioned and controlled” notice.

---

# 10. Evidence Preview Pattern

## 10.1 Evidence Preview Layout
Use a drawer or split pane with:
- preview area,
- metadata panel,
- linked records panel,
- audit shortcut,
- checksum/verification status.

## 10.2 File Type Behaviors

| File Type | Preview Behavior |
|---|---|
| PDF | Page preview, page reference, zoom, open original |
| JPG/PNG | Image preview, zoom, rotate if supported |
| XLSX/CSV | Tabular preview of limited rows; download/open original |
| DWG/DXF | Metadata and open original; viewer optional |
| STL | Metadata and optional 3D viewer if implemented |
| ZIP | Metadata, file listing if backend supports it; otherwise download/open original |

## 10.3 Evidence Metadata Display
Always show:
- evidence_code
- asset_tag
- inspection_id
- method
- component
- CML/TML/Grid reference if applicable
- inspection date
- source file name
- page/figure/table reference if applicable
- uploaded by
- checksum
- verification status

## 10.4 Evidence Link Pattern
Every engineering record requiring evidence should show:
- linked evidence count,
- required/optional indicator,
- “Link Evidence” action,
- preview action,
- missing evidence warning.

---

# 11. Approval Action Pattern

## 11.1 Approval Panel Layout
Approval action area must include:
- current status,
- required permission indicator if disabled,
- gate checklist,
- reviewer/approver history,
- approve/reject/request correction buttons,
- audit drawer shortcut.

## 11.2 Approval Modal Fields
- decision
- comment/reason
- optional correction request details
- confirmation checkbox for high-impact actions

## 11.3 Gate States

| Gate State | UI Behavior |
|---|---|
| Pass | Approval button enabled if permission exists |
| Warning | Approval may proceed only if backend permits and comment required |
| Fail | Approval button disabled; show failed gate list |
| Unknown | Approval button disabled; prompt refresh |

## 11.4 Role Rules
- Inspector can submit but not approve engineering data.
- Engineer can review and correct technical records.
- Lead Engineer can approve calculations and integrity decisions where permitted.
- Approver can issue final approvals/reports where permitted.
- Management is generally read-only unless granted additional permissions.
- IT Admin manages users/workflow health, not engineering approval.

---

# 12. Navigation and Information Architecture

## 12.1 Sidebar Grouping

| Group | Pages |
|---|---|
| Overview | Dashboard |
| Assets | Asset Register, Asset Detail |
| Inspection | Inspection Workspace, NDT Data Room |
| Evidence and AI | Evidence Room, AI Extraction Review |
| Engineering | Calculation Workbook, Integrity Decision |
| Reporting | Report Builder |
| Operations | Work Orders |
| Administration | Admin Settings |

## 12.2 Breadcrumb Pattern
Use breadcrumbs for detail pages:
- Dashboard / Assets / `asset_tag`
- Assets / `asset_tag` / Inspections / `inspection_no`
- Assets / `asset_tag` / Reports / `report_no`

---

# 13. Empty State Pattern

## 13.1 Empty State Anatomy
- Short title.
- One-sentence explanation.
- Primary action if permitted.
- Secondary link to relevant documentation or parent record.

## 13.2 Examples
- Asset Register: “No assets registered. Create the first atmospheric storage tank asset.”
- Evidence Room: “No evidence files found. Upload evidence metadata after the original file is stored.”
- AI Extraction Review: “No extraction jobs found. Start from Evidence Room or create a new extraction job.”
- Calculation Workbook: “No calculations found. Select approved NDT data to run a deterministic calculation.”

---

# 14. Error State Pattern

## 14.1 Error State Anatomy
- Human-readable title.
- Safe message.
- Error code if available.
- Retry button.
- Link to error log if permitted.
- Support guidance for blocked workflow.

## 14.2 Error Copy Rules
- Do not show raw stack traces to general users.
- IT Admin may see technical details where permitted.
- Gate failures should be presented as action checklist, not generic error.

---

# 15. Audit Drawer Pattern

## 15.1 Audit Drawer Layout
- Entity summary header.
- Event timeline.
- Filter by event type.
- Actor, timestamp, comment, previous/new values.
- Read-only design.

## 15.2 Audit Event Display
Use clear labels:
- Created
- Updated
- Submitted
- Approved
- Rejected
- Corrected
- Evidence Linked
- Calculation Run
- Report Issued
- Work Order Closed
- Workflow Failed

---

# 16. Frontend Accessibility Requirements

- All interactive elements must be keyboard accessible.
- Focus ring visible on buttons, inputs, row actions, tabs, and drawers.
- Tables must have accessible headers.
- Badges cannot rely on color only.
- Form errors must be programmatically associated with fields.
- Modals and drawers must trap focus while open and restore focus on close.
- Evidence preview controls must have accessible labels.

---

# 17. Responsive Behavior

## Desktop
Primary target. Full table, split panels, and evidence drawer supported.

## Tablet
Sidebar collapses. Tables may become horizontally scrollable. Evidence preview drawer remains usable.

## Mobile
Not the primary MVP target. Provide basic responsive fallback for read-only views and emergency review, but heavy engineering workflows may display “desktop recommended” notice.

---

# 18. Implementation Tokens

## 18.1 CSS Variable Draft

```css
:root {
  --color-navy-900: #0B1F33;
  --color-navy-800: #12314F;
  --color-navy-700: #1D466B;
  --color-teal-700: #0F766E;
  --color-teal-600: #0D9488;
  --color-teal-100: #CCFBF1;
  --color-gray-950: #111827;
  --color-gray-700: #374151;
  --color-gray-500: #6B7280;
  --color-gray-200: #E5E7EB;
  --color-gray-100: #F3F4F6;
  --color-gray-50: #F9FAFB;
  --color-warning-600: #D97706;
  --color-warning-100: #FEF3C7;
  --color-danger-600: #DC2626;
  --color-danger-100: #FEE2E2;
  --color-success-600: #16A34A;
  --color-success-100: #DCFCE7;
}
```

## 18.2 Suggested Tailwind Mapping
If Tailwind is used, map these tokens into `theme.extend.colors` rather than using arbitrary colors throughout components.

---

# 19. Delivery Notes

## What Changed
Created a mini design system covering color palette, typography, layout, buttons, badges, tables, forms, modals, evidence preview, approval action pattern, empty/error states, audit drawer, accessibility, responsive behavior, and implementation tokens.

## AIM / n8n Boundary Confirmation
Design system reinforces AIM as system of record and presents n8n only through AIM workflow and error records. AI/calc outputs are visually gated until human approval.

## Suggested Run / Test Commands
```bash
npm run lint
npm run typecheck
npm run test:components
npm run test:a11y
npm run test:e2e
```

## Documentation Updates
Update this file when any visual token, status badge mapping, approval pattern, or evidence preview pattern changes.
