'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'teal' | 'navy';

export type DetailTab = {
  id: string;
  label: string;
  content: ReactNode;
};

export type CompactColumn<T> = {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'draft',
  pending: 'pending_review',
  pending_review: 'pending_review',
  in_review: 'pending_review',
  needs_review: 'needs_review',
  needs_correction: 'needs_review',
  approved: 'approved',
  reviewed: 'approved',
  human_reviewed: 'approved',
  rejected: 'rejected',
  blocked: 'blocked',
  invalid: 'blocked',
  failed: 'failed',
  error: 'failed',
  issued: 'issued',
  closed: 'closed',
  completed: 'closed',
  warning: 'needs_review',
  low_confidence: 'needs_review',
  staged: 'pending_review',
  staging: 'pending_review',
  open: 'pending_review',
  active: 'approved',
  in_service: 'approved'
};

export function normalizeStatus(status?: string | null, fallback = 'draft'): string {
  const normalized = String(status ?? '').trim().toLowerCase().replaceAll(' ', '_').replaceAll('-', '_');
  return STATUS_LABELS[normalized] ?? (normalized || fallback);
}

export function statusTone(status?: string | null): StatusTone {
  const normalized = normalizeStatus(status);
  if (['approved', 'closed'].includes(normalized)) return 'success';
  if (['pending_review', 'needs_review'].includes(normalized)) return 'warning';
  if (['rejected', 'blocked', 'failed'].includes(normalized)) return 'danger';
  if (['issued'].includes(normalized)) return 'navy';
  return 'neutral';
}

export function StatusBadge({ status, label }: { status?: string | null; label?: string }) {
  const normalized = normalizeStatus(status);
  return <span className={`pd-status pd-status--${statusTone(normalized)}`}>{label ?? normalized}</span>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  status,
  actions
}: {
  eyebrow?: string;
  title: string;
  description: string;
  status?: string | null;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header pd-page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="pd-page-header__actions">
        {status && <StatusBadge status={status} />}
        {actions}
      </div>
    </header>
  );
}

export function KpiCard({
  title,
  value,
  helper,
  status,
  href
}: {
  title: string;
  value: ReactNode;
  helper?: string;
  status?: string | null;
  href?: string;
}) {
  const body = (
    <>
      <strong className="pd-kpi__value">{value}</strong>
      <span className="pd-kpi__title">{title}</span>
      {helper && <span className="pd-kpi__helper">{helper}</span>}
      {status && <StatusBadge status={status} />}
    </>
  );

  if (href) {
    return <a className="pd-kpi" href={href}>{body}</a>;
  }
  return <div className="pd-kpi">{body}</div>;
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <section className="pd-state" role="status">
      <h2>{title}</h2>
      <p>{message}</p>
      {action && <div className="action-row">{action}</div>}
    </section>
  );
}

export function ErrorState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <section className="pd-state pd-state--error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {action && <div className="action-row">{action}</div>}
    </section>
  );
}

export function CompactDataTable<T>({
  rows,
  columns,
  getRowKey,
  emptyTitle,
  emptyMessage
}: {
  rows: T[];
  columns: Array<CompactColumn<T>>;
  getRowKey: (row: T) => string;
  emptyTitle: string;
  emptyMessage: string;
}) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} message={emptyMessage} />;

  return (
    <div className="pd-table-wrap">
      <table className="pd-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column.header} className={column.className}>{column.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => <td key={column.header} className={column.className}>{column.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DetailDrawer({
  open,
  title,
  subtitle,
  status,
  onClose,
  tabs
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  status?: string | null;
  onClose: () => void;
  tabs: DetailTab[];
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? 'overview');
  const active = useMemo(() => tabs.find((tab) => tab.id === activeTab) ?? tabs[0], [activeTab, tabs]);

  useEffect(() => {
    if (open) setActiveTab(tabs[0]?.id ?? 'overview');
  }, [open, tabs]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="pd-drawer-shell" role="presentation">
      <button className="pd-drawer-backdrop" type="button" aria-label="Close detail drawer" onClick={onClose} />
      <aside className="pd-drawer" role="dialog" aria-modal="true" aria-labelledby="pd-drawer-title">
        <div className="pd-drawer__header">
          <div>
            <h2 id="pd-drawer-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="pd-drawer__header-actions">
            {status && <StatusBadge status={status} />}
            <button className="secondary-button" type="button" onClick={onClose}>Close</button>
          </div>
        </div>

        {tabs.length > 1 && (
          <div className="pd-tabs" role="tablist" aria-label="Record detail sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tab.id === active?.id}
                className={tab.id === active?.id ? 'pd-tab is-active' : 'pd-tab'}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="pd-drawer__body">{active?.content}</div>
      </aside>
    </div>
  );
}

export function ActionModal({
  open,
  title,
  subtitle,
  status,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  status?: string | null;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="pd-modal-shell" role="presentation">
      <button className="pd-modal-backdrop" type="button" aria-label="Close action dialog" onClick={onClose} />
      <section className="pd-modal" role="dialog" aria-modal="true" aria-labelledby="pd-modal-title">
        <div className="pd-modal__header">
          <div>
            <h2 id="pd-modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {status && <StatusBadge status={status} />}
        </div>
        <div className="pd-modal__body">{children}</div>
        <div className="pd-modal__footer">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
        </div>
      </section>
    </div>
  );
}

export function DetailGrid({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="pd-detail-grid">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function GateSummary({
  pass = 0,
  warning = 0,
  fail = 0,
  label = 'Gate summary'
}: {
  pass?: number;
  warning?: number;
  fail?: number;
  label?: string;
}) {
  return (
    <div className="pd-gates" aria-label={label}>
      <span><strong>{pass}</strong> pass</span>
      <span className="pd-gates__warning"><strong>{warning}</strong> warning</span>
      <span className="pd-gates__fail"><strong>{fail}</strong> fail</span>
    </div>
  );
}

export function TechnicalJson({ value, empty = 'No technical metadata returned.' }: { value: unknown; empty?: string }) {
  if (value === null || value === undefined || value === '') return <EmptyState title="No metadata" message={empty} />;
  return <pre className="json-panel pd-json-panel">{JSON.stringify(value, null, 2)}</pre>;
}
