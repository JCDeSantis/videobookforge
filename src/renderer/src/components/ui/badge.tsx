import { type HTMLAttributes } from 'react'
import { cn } from '@renderer/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'violet' | 'green' | 'yellow'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        {
          default: 'bg-zinc-800 text-zinc-400',
          violet: 'bg-violet-900/50 text-violet-400',
          green: 'bg-green-900/50 text-green-400',
          yellow: 'bg-yellow-900/50 text-yellow-400'
        }[variant],
        className
      )}
      {...props}
    />
  )
}
