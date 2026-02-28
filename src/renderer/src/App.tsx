import { useProjectStore } from '@renderer/store/useProjectStore'
import { StepNav } from '@renderer/components/StepNav'
import { Button } from '@renderer/components/ui/button'
import { ImportPage } from '@renderer/pages/ImportPage'
import { MetadataPage } from '@renderer/pages/MetadataPage'
import { BackgroundPage } from '@renderer/pages/BackgroundPage'
import { ExportSettingsPage } from '@renderer/pages/ExportSettingsPage'
import { ConvertPage } from '@renderer/pages/ConvertPage'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import logo from './assets/logo.png'

declare const __APP_VERSION__: string

const PAGES = [ImportPage, MetadataPage, BackgroundPage, ExportSettingsPage, ConvertPage]
const STEP_TITLES = ['Import Files', 'Metadata', 'Background', 'Export Settings', 'Convert']

function canAdvance(step: number, state: ReturnType<typeof useProjectStore.getState>): boolean {
  if (step === 0) return state.audioFiles.length > 0
  if (step === 1) return true
  if (step === 2) return true
  if (step === 3) return state.outputPath.length > 0
  return false
}

export function App(): React.JSX.Element {
  const store = useProjectStore()
  const { currentStep, setCurrentStep } = store

  const Page = PAGES[currentStep]
  const isLastStep = currentStep === PAGES.length - 1
  const isProcessing =
    (store.conversionProgress !== null &&
      store.conversionProgress.phase !== 'done' &&
      store.conversionProgress.phase !== 'error') ||
    (store.whisperProgress !== null &&
      store.whisperProgress.phase !== 'done' &&
      store.whisperProgress.phase !== 'error')

  function handleNext(): void {
    if (canAdvance(currentStep, store)) setCurrentStep(currentStep + 1)
  }

  function handleBack(): void {
    if (currentStep > 0 && !isProcessing) setCurrentStep(currentStep - 1)
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-zinc-800/60 shrink-0">
        <div className="flex items-center gap-3">
          <img src={logo} alt="VideoBook Forge" className="w-8 h-8 rounded-md" />
          <div className="flex items-center gap-2">
            <span className="text-violet-400 font-bold text-sm tracking-tight">VideoBook Forge</span>
            <span className="text-zinc-700 text-xs">·</span>
            <span className="text-zinc-500 text-xs">{STEP_TITLES[currentStep]}</span>
          </div>
        </div>
        <span className="text-zinc-600 text-[10px] font-mono">v{__APP_VERSION__}</span>
      </div>

      {/* Step nav */}
      <StepNav
        currentStep={currentStep}
        onStepClick={(s) => { if (!isProcessing) setCurrentStep(s) }}
      />

      {/* Page content */}
      <div className="flex-1 overflow-hidden px-6 py-5">
        <Page />
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800/60 bg-zinc-950/80 shrink-0">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 0 || isProcessing}
        >
          <ChevronLeft size={15} />
          Back
        </Button>

        <div className="flex items-center gap-1.5">
          {PAGES.map((_, i) => (
            <div
              key={i}
              className={
                i === currentStep
                  ? 'h-1.5 w-4 rounded-full bg-violet-500'
                  : i < currentStep
                    ? 'h-1.5 w-1.5 rounded-full bg-zinc-600'
                    : 'h-1.5 w-1.5 rounded-full bg-zinc-800'
              }
            />
          ))}
        </div>

        {!isLastStep ? (
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!canAdvance(currentStep, store)}
          >
            Next
            <ChevronRight size={15} />
          </Button>
        ) : (
          <div className="w-16" />
        )}
      </div>
    </div>
  )
}

export default App
