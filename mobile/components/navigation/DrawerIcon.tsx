import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { ReactNode } from 'react';

export type DrawerIconName =
  | 'today'
  | 'history'
  | 'streaks'
  | 'wellness'
  | 'tracking'
  | 'doctor'
  | 'records'
  | 'safety'
  | 'account'
  | 'help'
  | 'signOut'
  | 'sun'
  | 'moon'
  | 'chevron';

function shapes(name: DrawerIconName): ReactNode {
  switch (name) {
    case 'today':
      return (
        <>
          <Path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
          <Path d="m8.5 8.5 7 7" />
        </>
      );
    case 'history':
      return (
        <>
          <Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <Path d="M3 3v5h5M12 7v5l4 2" />
        </>
      );
    case 'streaks':
      return (
        <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      );
    case 'wellness':
      return (
        <Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      );
    case 'tracking':
      return <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />;
    case 'doctor':
      return (
        <>
          <Path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 12 0V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
          <Path d="M8 15v1a6 6 0 0 0 12 0v-4" />
          <Circle cx={20} cy={10} r={2} />
        </>
      );
    case 'records':
      return (
        <>
          <Rect x={8} y={2} width={8} height={4} rx={1} />
          <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <Path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
        </>
      );
    case 'safety':
      return (
        <>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <Path d="m9 12 2 2 4-4" />
        </>
      );
    case 'account':
      return (
        <>
          <Circle cx={12} cy={8} r={5} />
          <Path d="M20 21a8 8 0 0 0-16 0" />
        </>
      );
    case 'help':
      return (
        <>
          <Circle cx={12} cy={12} r={10} />
          <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
        </>
      );
    case 'signOut':
      return (
        <>
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <Path d="m16 17 5-5-5-5M21 12H9" />
        </>
      );
    case 'sun':
      return (
        <>
          <Circle cx={12} cy={12} r={4} />
          <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </>
      );
    case 'moon':
      return <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />;
    case 'chevron':
      return <Path d="m9 18 6-6-6-6" />;
  }
}

export function DrawerIcon({
  name,
  color,
  size = 20,
  strokeWidth = 2,
}: {
  name: DrawerIconName;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shapes(name)}
    </Svg>
  );
}
