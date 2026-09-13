import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useTotals } from '@/context/plannerContext'
import { formatMoney } from '@/lib/money'
import { cx } from '@/lib/cx'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  IconCart,
  IconHome,
  IconList,
  IconPlus,
  IconSettings,
  IconTag,
  IconWallet,
} from '@/components/icons'

interface NavItem {
  to: string
  label: string
  short: string
  icon: (props: { className?: string }) => ReactNode
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: IconHome },
  { to: '/list', label: 'Shopping List', short: 'List', icon: IconList },
  { to: '/prices', label: 'Price Tracker', short: 'Prices', icon: IconTag },
  { to: '/budget', label: 'Budget', short: 'Budget', icon: IconWallet },
  { to: '/add', label: 'Add Product', short: 'Add', icon: IconPlus },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: IconSettings },
]

/** Bottom bar layout: two tabs, the add button, two more tabs. */
const MOBILE_TABS = [NAV[0], NAV[1], NAV[2], NAV[3]]

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/list': 'Shopping List',
  '/prices': 'Price Tracker',
  '/budget': 'Budget',
  '/add': 'Add Product',
  '/settings': 'Settings',
}

function Wordmark({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-on-brand">
        <IconCart className="size-5" />
      </span>
      {!compact ? (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[15px] font-semibold tracking-tight text-ink">
            Shopping List
          </span>
          <span className="block text-[11.5px] text-ink-muted">Plan · price · budget</span>
        </span>
      ) : null}
    </span>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const totals = useTotals()
  const title = PAGE_TITLES[location.pathname] ?? 'Shopping List'

  return (
    <div className="min-h-dvh bg-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
        <div className="px-2 pb-5">
          <Wordmark />
        </div>

        <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition',
                  isActive
                    ? 'bg-brand-soft text-brand-ink'
                    : 'text-ink-soft hover:bg-surface-muted hover:text-ink',
                )
              }
            >
              <item.icon className="size-4.5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 space-y-3 px-1">
          <NavLink
            to="/shopping"
            className="flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13.5px] font-semibold text-bg transition hover:opacity-90"
          >
            <IconCart className="size-4" />
            Shopping Mode
          </NavLink>

          <div className="rounded-2xl bg-surface-muted px-3.5 py-3">
            <p className="text-[10.5px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
              Remaining
            </p>
            <p
              className={cx(
                'tnum mt-0.5 text-[17px] font-semibold',
                totals.remaining < 0 ? 'text-negative' : 'text-ink',
              )}
            >
              {formatMoney(totals.remaining, totals.currency)}
            </p>
            <p className="tnum mt-0.5 text-[11.5px] text-ink-muted">
              {totals.purchasedCount}/{totals.totalCount} items bought
            </p>
          </div>

          <ThemeToggle className="w-full" />
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md pt-safe px-inset lg:hidden">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Wordmark compact />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold tracking-tight text-ink">{title}</p>
            <p className="tnum truncate text-[11.5px] text-ink-muted">
              {formatMoney(totals.remaining, totals.currency)} left · {totals.purchasedCount}/{totals.totalCount}{' '}
              bought
            </p>
          </div>
          <ThemeToggle iconOnly />
          <NavLink
            to="/settings"
            aria-label="Settings"
            className={({ isActive }) =>
              cx(
                'grid size-9 shrink-0 place-items-center rounded-full border border-line transition',
                isActive ? 'bg-brand-soft text-brand-ink' : 'bg-surface text-ink-soft',
              )
            }
          >
            <IconSettings className="size-4.5" />
          </NavLink>
        </div>
      </header>

      <main className="lg:pl-60">
        <div className="mx-auto w-full max-w-5xl px-gutter pt-4 pb-32 lg:pt-8 lg:pb-12">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/92 backdrop-blur-xl pb-safe px-inset lg:hidden"
      >
        <div className="relative mx-auto grid max-w-md grid-cols-5 items-center px-1">
          {MOBILE_TABS.slice(0, 2).map((item) => (
            <MobileTab key={item.to} item={item} />
          ))}

          <div className="flex justify-center">
            <NavLink
              to="/add"
              aria-label="Add product"
              className={({ isActive }) =>
                cx(
                  'mb-1 grid size-13 place-items-center rounded-full text-on-brand shadow-pop transition active:scale-95',
                  isActive ? 'bg-brand-strong' : 'bg-brand',
                )
              }
            >
              <IconPlus className="size-6" strokeWidth={2.4} />
            </NavLink>
          </div>

          {MOBILE_TABS.slice(2).map((item) => (
            <MobileTab key={item.to} item={item} />
          ))}
        </div>
      </nav>
    </div>
  )
}

function MobileTab({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cx(
          'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10.5px] font-semibold transition',
          isActive ? 'text-brand' : 'text-ink-muted',
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon className={cx('size-5.5', isActive && 'scale-105')} />
          <span className="truncate">{item.short}</span>
        </>
      )}
    </NavLink>
  )
}
