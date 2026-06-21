import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  block?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover',
  secondary: 'bg-rail-hover text-ink-dark hover:bg-rail-active',
  outline: 'border border-line text-ink-strong hover:bg-list',
  ghost: 'text-ink-muted hover:bg-list hover:text-ink-strong'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', block, className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-body font-medium transition-colors disabled:opacity-50',
        variants[variant],
        block && 'w-full',
        className
      )}
      {...props}
    />
  )
)
Button.displayName = 'Button'
