import { BookOpen, Tag, Image, Clapperboard, Check } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

const STEPS = [
  { label: 'Import', icon: BookOpen },
  { label: 'Metadata', icon: Tag },
  { label: 'Background', icon: Image },
  { label: 'Convert', icon: Clapperboard }
]

interface StepNavProps {
  currentStep: number
  onStepClick?: (step: number) => void
}

export function StepNav({ currentStep, onStepClick }: StepNavProps) {
  return (
    <div className="flex items-center gap-0 px-6 py-3 border-b border-zinc-800 bg-zinc-950/80">
      {STEPS.map((step, i) => {
        const done = i < currentStep
        const active = i === currentStep
        const clickable = onStepClick && i < currentStep
        const StepIcon = step.icon

        return (
          <div key={i} className="flex items-center">
            <button
              onClick={() => clickable && onStepClick(i)}
              disabled={!clickable}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                active && 'text-violet-400 bg-violet-500/10',
                done && 'text-zinc-300 hover:text-white cursor-pointer',
                !active && !done && 'text-zinc-600 cursor-default'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold border',
                  active && 'border-violet-500 bg-violet-500/20 text-violet-400',
                  done && 'border-zinc-600 bg-zinc-700 text-zinc-300',
                  !active && !done && 'border-zinc-700 text-zinc-600'
                )}
              >
                {done ? <Check size={11} strokeWidth={3} /> : <StepIcon size={10} />}
              </span>
              <span>{step.label}</span>
            </button>

            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-px w-8 mx-1',
                  i < currentStep ? 'bg-zinc-600' : 'bg-zinc-800'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
