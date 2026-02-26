import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/utils'

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors resize-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 disabled:opacity-40',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export { Textarea }
