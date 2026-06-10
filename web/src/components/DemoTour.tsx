import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DEMO_TOUR_STEPS,
  setDemoTourDone,
  type DemoTourPlacement,
  type DemoTourStep,
} from '../lib/demoTour'
import { DemoTourArrow } from './DemoTourArrow'

type Rect = {
  top: number
  left: number
  width: number
  height: number
}

type DemoTourProps = {
  active: boolean
  userId: string
  onComplete: () => void
}

const TOOLTIP_GAP = 14
const VIEWPORT_PAD = 12

function measureTarget(selector: string): Rect | null {
  const el = document.querySelector(selector)
  if (!el) return null
  const box = el.getBoundingClientRect()
  if (box.width < 1 && box.height < 1) return null
  return {
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
  }
}

function tooltipPosition(
  target: Rect,
  placement: DemoTourPlacement,
  tooltipWidth: number,
  tooltipHeight: number,
): { top: number; left: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight

  let top: number
  let left: number

  switch (placement) {
    case 'top':
      top = target.top - tooltipHeight - TOOLTIP_GAP
      left = target.left + target.width / 2 - tooltipWidth / 2
      break
    case 'left':
      top = target.top + target.height / 2 - tooltipHeight / 2
      left = target.left - tooltipWidth - TOOLTIP_GAP
      break
    case 'right':
      top = target.top + target.height / 2 - tooltipHeight / 2
      left = target.left + target.width + TOOLTIP_GAP
      break
    case 'bottom':
    default:
      top = target.top + target.height + TOOLTIP_GAP
      left = target.left + target.width / 2 - tooltipWidth / 2
      break
  }

  left = Math.max(VIEWPORT_PAD, Math.min(left, vw - tooltipWidth - VIEWPORT_PAD))
  top = Math.max(VIEWPORT_PAD, Math.min(top, vh - tooltipHeight - VIEWPORT_PAD))
  return { top, left }
}

export function DemoTour({ active, userId, onComplete }: DemoTourProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [tooltipBox, setTooltipBox] = useState({ width: 300, height: 160 })

  const step: DemoTourStep | undefined = DEMO_TOUR_STEPS[stepIndex]
  const total = DEMO_TOUR_STEPS.length

  const finish = useCallback(() => {
    setDemoTourDone(userId)
    setStepIndex(0)
    setTargetRect(null)
    onComplete()
  }, [userId, onComplete])

  const updateMeasurements = useCallback(() => {
    if (!active || !step) return
    const el = document.querySelector(step.target)
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
    requestAnimationFrame(() => {
      setTargetRect(measureTarget(step.target))
    })
  }, [active, step])

  useLayoutEffect(() => {
    if (!active) {
      setTargetRect(null)
      return
    }
    updateMeasurements()
  }, [active, stepIndex, updateMeasurements])

  useEffect(() => {
    if (!active) return

    function onLayoutChange() {
      updateMeasurements()
    }

    window.addEventListener('resize', onLayoutChange)
    window.addEventListener('scroll', onLayoutChange, true)
    return () => {
      window.removeEventListener('resize', onLayoutChange)
      window.removeEventListener('scroll', onLayoutChange, true)
    }
  }, [active, updateMeasurements])

  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [active])

  useEffect(() => {
    if (!active) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') finish()
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, finish])

  function handleNext() {
    if (!step) return

    if (stepIndex >= total - 1) {
      finish()
      return
    }

    setStepIndex((i) => i + 1)
  }

  if (!active || !step) return null

  const tooltipPos =
    targetRect != null
      ? tooltipPosition(targetRect, step.placement, tooltipBox.width, tooltipBox.height)
      : { top: '50%', left: '50%' }

  return createPortal(
    <div className="demo-tour-layer" role="presentation">
      <button
        type="button"
        className="demo-tour-scrim"
        aria-label="Skip tour"
        onClick={finish}
      />

      {targetRect && (
        <div
          className="demo-tour-spotlight"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
          aria-hidden
        />
      )}

      <div
        className="demo-tour-tooltip"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-tour-title"
        style={
          typeof tooltipPos.top === 'number'
            ? { top: tooltipPos.top, left: tooltipPos.left }
            : {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }
        }
        ref={(node) => {
          if (!node) return
          const { width, height } = node.getBoundingClientRect()
          if (
            Math.abs(width - tooltipBox.width) > 2 ||
            Math.abs(height - tooltipBox.height) > 2
          ) {
            setTooltipBox({ width, height })
          }
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <DemoTourArrow variant={step.arrow} className={`demo-tour-arrow-${step.placement}`} />
        <p className="demo-tour-step-label">
          Step {stepIndex + 1} of {total}
        </p>
        <h3 id="demo-tour-title">{step.title}</h3>
        <p className="demo-tour-body">{step.body}</p>
        <div className="demo-tour-actions">
          <button type="button" className="btn btn-ghost" onClick={finish}>
            Skip tour
          </button>
          <button type="button" className="btn btn-primary" onClick={handleNext}>
            {stepIndex >= total - 1 ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
