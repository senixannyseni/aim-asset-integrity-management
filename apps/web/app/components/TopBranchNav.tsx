'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

export type TopBranchItem = {
  id: string;
  label: string;
  href?: string;
  count?: number | string;
  status?: string;
  ariaLabel?: string;
  disabled?: boolean;
  description?: string;
  icon?: ReactNode;
};

export function useActiveTopBranch(items: TopBranchItem[], defaultId = items[0]?.id ?? 'overview', queryParam = 'tab'): string {
  const searchParams = useSearchParams();
  const requested = searchParams.get(queryParam);
  const enabledIds = items.filter((item) => !item.disabled).map((item) => item.id);
  return requested && enabledIds.includes(requested) ? requested : defaultId;
}

export function TopBranchNav({
  items,
  activeId,
  queryParam = 'tab',
  ariaLabel = 'Workspace branches'
}: {
  items: TopBranchItem[];
  activeId?: string;
  queryParam?: string;
  ariaLabel?: string;
}) {
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const activeFromQuery = useActiveTopBranch(items, items[0]?.id, queryParam);
  const active = activeId ?? activeFromQuery;

  function branchHref(item: TopBranchItem): string {
    if (item.href) return item.href;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set(queryParam, item.id);
    const query = nextParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <nav className="top-branch-nav" aria-label={ariaLabel}>
      <div className="top-branch-nav__rail" role="list">
        {items.map((item) => {
          const isActive = active === item.id;
          const content = (
            <>
              <span className="top-branch-nav__label">{item.label}</span>
              {item.count !== undefined && <span className="top-branch-nav__count" aria-label={`${item.count} items`}>{item.count}</span>}
              {item.status && <span className="top-branch-nav__status">{item.status}</span>}
            </>
          );

          if (item.disabled) {
            return (
              <button
                key={item.id}
                className="top-branch-nav__item is-disabled"
                type="button"
                disabled
                title={item.ariaLabel ?? item.label}
                aria-label={item.ariaLabel ?? item.label}
                role="listitem"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              className={isActive ? 'top-branch-nav__item is-active' : 'top-branch-nav__item'}
              href={branchHref(item)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.ariaLabel ?? item.label}
              title={item.ariaLabel ?? item.label}
              role="listitem"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
