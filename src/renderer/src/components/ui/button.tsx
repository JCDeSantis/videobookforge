import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40',
          {
            primary:
              'bg-violet-600 text-white hover:bg-violet-500 active:bg-violet-700',
            secondary:
              'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:bg-zinc-800 border border-zinc-700',
            ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
            danger: 'bg-red-900/50 text-red-400 hover:bg-red-900 border border-red-800'
          }[variant],
          {
            sm: 'h-7 px-3 text-xs',
            md: 'h-9 px-4 text-sm',
            lg: 'h-11 px-6 text-base'
          }[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
