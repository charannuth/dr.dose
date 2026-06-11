import Svg, { Line, Polygon } from 'react-native-svg';
import type { DemoTourPlacement } from '../lib/demoTour';
import { tourPointerLine, type TourRect } from '../lib/demoTourPointer';

type Props = {
  tooltip: TourRect;
  target: TourRect;
  placement: DemoTourPlacement;
  color: string;
};

export function DemoTourPointer({ tooltip, target, placement, color }: Props) {
  const { x1, y1, x2, y2 } = tourPointerLine(tooltip, target, placement);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 10;
  const headWidth = 6;
  const tipX = x2;
  const tipY = y2;
  const baseX = tipX - headLen * Math.cos(angle);
  const baseY = tipY - headLen * Math.sin(angle);
  const leftX = baseX + headWidth * Math.cos(angle + Math.PI / 2);
  const leftY = baseY + headWidth * Math.sin(angle + Math.PI / 2);
  const rightX = baseX + headWidth * Math.cos(angle - Math.PI / 2);
  const rightY = baseY + headWidth * Math.sin(angle - Math.PI / 2);

  return (
    <Svg
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Polygon
        points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`}
        fill={color}
      />
    </Svg>
  );
}
