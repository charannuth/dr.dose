import type { ReactNode } from 'react'
import type { DemoTourArrow as ArrowVariant } from '../lib/demoTour'

type Props = {
  variant: ArrowVariant
  className?: string
}

/** Hand-drawn style arrows for the product tour tooltips. */
export function DemoTourArrow({ variant, className = '' }: Props) {
  const paths: Record<ArrowVariant, ReactNode> = {
    'curve-up-left': (
      <path
        d="M52 8 C38 8 28 18 22 32 C16 46 10 58 4 72"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    ),
    'curve-up-right': (
      <path
        d="M4 8 C18 8 28 18 34 32 C40 46 46 58 52 72"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    ),
    'curve-down-left': (
      <path
        d="M52 72 C38 72 28 62 22 48 C16 34 10 22 4 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    ),
    'curve-down-right': (
      <path
        d="M4 72 C18 72 28 62 34 48 C40 34 46 22 52 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    ),
  }

  const heads: Record<ArrowVariant, ReactNode> = {
    'curve-up-left': (
      <path d="M4 72 L10 58 L1 64 Z" fill="currentColor" stroke="none" />
    ),
    'curve-up-right': (
      <path d="M52 72 L46 58 L55 64 Z" fill="currentColor" stroke="none" />
    ),
    'curve-down-left': (
      <path d="M4 8 L10 22 L1 16 Z" fill="currentColor" stroke="none" />
    ),
    'curve-down-right': (
      <path d="M52 8 L46 22 L55 16 Z" fill="currentColor" stroke="none" />
    ),
  }

  return (
    <svg
      className={`demo-tour-arrow ${className}`.trim()}
      viewBox="0 0 56 80"
      fill="none"
      aria-hidden
    >
      {paths[variant]}
      {heads[variant]}
    </svg>
  )
}
