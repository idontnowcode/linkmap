import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-sm border border-line bg-white px-3 text-body text-ink-strong outline-none placeholder:text-ink-muted focus:border-brand',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full resize-none rounded-sm border border-line bg-white px-3 py-2 text-body text-ink-strong outline-none placeholder:text-ink-muted focus:border-brand',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-label uppercase text-ink-muted">{label}</span>
      {children}
    </label>
  )
}
