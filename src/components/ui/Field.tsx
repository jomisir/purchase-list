import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

const control =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink ' +
  'placeholder:text-ink-faint transition focus:border-brand focus:outline-none ' +
  'focus:ring-2 focus:ring-brand/25 disabled:opacity-60'

function Wrapper({
  id,
  label,
  hint,
  error,
  required,
  suffix,
  children,
}: {
  id: string
  label: string
  hint?: ReactNode
  error?: string | null
  required?: boolean
  suffix?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold text-ink-soft">
          {label}
          {required ? (
            <span className="ml-1 text-negative" aria-hidden="true">
              *
            </span>
          ) : null}
          {required ? <span className="sr-only"> (required)</span> : null}
        </label>
        {suffix}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[12.5px] font-medium text-negative">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[12.5px] text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hint?: ReactNode
  error?: string | null
  prefix?: string
  suffix?: ReactNode
}

export function TextField({
  label,
  hint,
  error,
  required,
  prefix,
  suffix,
  className,
  ...props
}: TextFieldProps) {
  const id = useId()
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} required={required} suffix={suffix}>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[13px] font-semibold text-ink-muted">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cx(
            control,
            'tnum',
            prefix && 'pl-13',
            error && 'border-negative focus:border-negative focus:ring-negative/25',
            className,
          )}
          {...props}
        />
      </div>
    </Wrapper>
  )
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string
  hint?: ReactNode
  error?: string | null
}

export function SelectField({
  label,
  hint,
  error,
  required,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const id = useId()
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} required={required}>
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cx(control, 'appearance-none bg-[right_0.9rem_center] bg-no-repeat pr-10', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 6 6.5l5-5' fill='none' stroke='%23807b72' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
    </Wrapper>
  )
}

export interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string
  hint?: ReactNode
  error?: string | null
}

export function TextAreaField({
  label,
  hint,
  error,
  required,
  className,
  ...props
}: TextAreaFieldProps) {
  const id = useId()
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cx(control, 'min-h-24 resize-y leading-relaxed', className)}
        {...props}
      />
    </Wrapper>
  )
}
