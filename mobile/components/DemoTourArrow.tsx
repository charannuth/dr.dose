import Svg, { Path } from 'react-native-svg';
import type { DemoTourArrow as ArrowVariant } from '../lib/demoTour';

type Props = {
  variant: ArrowVariant;
  color: string;
  style?: { position: 'absolute'; top?: number; bottom?: number; left?: number; right?: number };
};

const paths: Record<ArrowVariant, string> = {
  'curve-up-left': 'M52 8 C38 8 28 18 22 32 C16 46 10 58 4 72',
  'curve-up-right': 'M4 8 C18 8 28 18 34 32 C40 46 46 58 52 72',
  'curve-down-left': 'M52 72 C38 72 28 62 22 48 C16 34 10 22 4 8',
  'curve-down-right': 'M4 72 C18 72 28 62 34 48 C40 34 46 22 52 8',
};

const heads: Record<ArrowVariant, string> = {
  'curve-up-left': 'M4 72 L10 58 L1 64 Z',
  'curve-up-right': 'M52 72 L46 58 L55 64 Z',
  'curve-down-left': 'M4 8 L10 22 L1 16 Z',
  'curve-down-right': 'M52 8 L46 22 L55 16 Z',
};

/** Hand-drawn style arrows for the product tour tooltips. */
export function DemoTourArrow({ variant, color, style }: Props) {
  return (
    <Svg width={56} height={80} viewBox="0 0 56 80" style={style} pointerEvents="none">
      <Path
        d={paths[variant]}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
      <Path d={heads[variant]} fill={color} stroke="none" />
    </Svg>
  );
}
