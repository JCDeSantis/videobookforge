import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/utils'

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 disabled:opacity-40',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
