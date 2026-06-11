import type { DemoTourPlacement } from '../lib/demoTour'
import { tourPointerLine, type TourRect } from '../lib/demoTourPointer'

type Props = {
  tooltip: TourRect
  target: TourRect
  placement: DemoTourPlacement
}

export function DemoTourPointer({ tooltip, target, placement }: Props) {
  const { x1, y1, x2, y2 } = tourPointerLine(tooltip, target, placement)
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 10
  const headWidth = 6
  const tipX = x2
  const tipY = y2
  const baseX = tipX - headLen * Math.cos(angle)
  const baseY = tipY - headLen * Math.sin(angle)
  const leftX = baseX + headWidth * Math.cos(angle + Math.PI / 2)
  const leftY = baseY + headWidth * Math.sin(angle + Math.PI / 2)
  const rightX = baseX + headWidth * Math.cos(angle - Math.PI / 2)
  const rightY = baseY + headWidth * Math.sin(angle - Math.PI / 2)

  return (
    <svg
      className="demo-tour-pointer"
      aria-hidden
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 3 }}
    >
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
      <polygon points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`} fill="currentColor" />
    </svg>
  )
}
