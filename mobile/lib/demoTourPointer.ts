import type { DemoTourPlacement } from './demoTour';

export type TourRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

/** Tooltip anchor on the edge that faces the target. */
function tooltipAnchor(tooltip: TourRect, placement: DemoTourPlacement) {
  switch (placement) {
    case 'top':
      return {
        x: tooltip.left + tooltip.width / 2,
        y: tooltip.top + tooltip.height,
      };
    case 'left':
      return {
        x: tooltip.left + tooltip.width,
        y: tooltip.top + tooltip.height / 2,
      };
    case 'right':
      return {
        x: tooltip.left,
        y: tooltip.top + tooltip.height / 2,
      };
    case 'bottom':
    default:
      return {
        x: tooltip.left + tooltip.width / 2,
        y: tooltip.top,
      };
  }
}

export function tourPointerLine(
  tooltip: TourRect,
  target: TourRect,
  placement: DemoTourPlacement,
): { x1: number; y1: number; x2: number; y2: number } {
  const start = tooltipAnchor(tooltip, placement);
  const endX = Math.max(target.left, Math.min(start.x, target.left + target.width));
  const endY = Math.max(target.top, Math.min(start.y, target.top + target.height));
  return { x1: start.x, y1: start.y, x2: endX, y2: endY };
}
