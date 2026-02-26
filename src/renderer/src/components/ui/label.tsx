import { forwardRef, type LabelHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/utils'

const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('block text-xs font-medium text-zinc-400 mb-1', className)}
      {...props}
    />
  )
)
Label.displayName = 'Label'

export { Label }
