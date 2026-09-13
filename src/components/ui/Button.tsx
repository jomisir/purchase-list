import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/cx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'contrast'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-strong shadow-sm',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-muted',
  ghost: 'text-ink-soft hover:bg-surface-muted',
  danger: 'bg-negative-soft text-negative border border-negative/25 hover:brightness-95',
  // Inverted against the page, so it stays legible in both themes.
  contrast: 'bg-ink text-bg hover:opacity-90 shadow-sm',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-13 px-6 text-[15px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    />
  )
}

export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...props
}: {
  to: string
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  className?: string
  children?: ReactNode
} & Omit<React.ComponentProps<typeof Link>, 'to' | 'className'>) {
  return (
    <Link
      to={to}
      className={cx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {children}
    </Link>
  )
}
