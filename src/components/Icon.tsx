import Svg, { Circle, Path } from 'react-native-svg';

export type IconName =
  | 'truck'
  | 'eye'
  | 'eyeOff'
  | 'alert'
  | 'clock'
  | 'play'
  | 'check'
  | 'x'
  | 'cancelled'
  | 'navigate'
  | 'refresh'
  | 'note'
  | 'chevronDown'
  | 'chevronUp'
  | 'list'
  | 'map'
  | 'user'
  | 'back'
  | 'pin'
  | 'locate'
  | 'cloudCheck'
  | 'logout';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Line icons copied from the design's inline SVGs (24×24 grid).
export function Icon({ name, size = 22, color = '#15171A', strokeWidth = 2 }: Props) {
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  const paths = (() => {
    switch (name) {
      case 'truck':
        return (
          <>
            <Path d="M2 6h12v10H2z" {...stroke} />
            <Path d="M14 9h4l3 3.5V16h-7" {...stroke} />
            <Circle cx="6.5" cy="17" r="2" {...stroke} />
            <Circle cx="17" cy="17" r="2" {...stroke} />
          </>
        );
      case 'eye':
        return (
          <>
            <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" {...stroke} />
            <Circle cx="12" cy="12" r="3" {...stroke} />
          </>
        );
      case 'eyeOff':
        return (
          <>
            <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" {...stroke} />
            <Circle cx="12" cy="12" r="3" {...stroke} />
            <Path d="M4 4l16 16" {...stroke} />
          </>
        );
      case 'alert':
        return (
          <>
            <Circle cx="12" cy="12" r="9" {...stroke} />
            <Path d="M12 7.5v5.5M12 16.5v.5" {...stroke} />
          </>
        );
      case 'clock':
        return (
          <>
            <Circle cx="12" cy="12" r="9" {...stroke} />
            <Path d="M12 7v5l3 2" {...stroke} />
          </>
        );
      case 'play':
        return <Path d="M7 5l12 7-12 7z" fill={color} />;
      case 'check':
        return <Path d="M5 12.5l4.5 4.5L19 7.5" {...stroke} />;
      case 'x':
        return <Path d="M6 6l12 12M18 6L6 18" {...stroke} />;
      case 'cancelled':
        return (
          <>
            <Circle cx="12" cy="12" r="9" {...stroke} />
            <Path d="M6 18L18 6" {...stroke} />
          </>
        );
      case 'navigate':
        return <Path d="M3 11l18-8-8 18-2-8z" {...stroke} />;
      case 'refresh':
        return (
          <>
            <Path d="M20 12a8 8 0 1 1-2.6-5.9" {...stroke} />
            <Path d="M20 4v5h-5" {...stroke} />
          </>
        );
      case 'note':
        return (
          <>
            <Path d="M4 4h16v11l-5 5H4z" {...stroke} />
            <Path d="M15 20v-5h5" {...stroke} />
          </>
        );
      case 'chevronDown':
        return <Path d="M6 9l6 6 6-6" {...stroke} />;
      case 'chevronUp':
        return <Path d="M6 15l6-6 6 6" {...stroke} />;
      case 'list':
        return <Path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" {...stroke} />;
      case 'map':
        return (
          <>
            <Path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" {...stroke} />
            <Path d="M9 4v14M15 6v14" {...stroke} />
          </>
        );
      case 'user':
        return (
          <>
            <Circle cx="12" cy="8" r="4" {...stroke} />
            <Path d="M4 21c0-4 4-6 8-6s8 2 8 6" {...stroke} />
          </>
        );
      case 'back':
        return <Path d="M15 5l-7 7 7 7" {...stroke} />;
      case 'pin':
        return (
          <>
            <Path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" {...stroke} />
            <Circle cx="12" cy="9" r="2.5" {...stroke} />
          </>
        );
      case 'locate':
        return (
          <>
            <Circle cx="12" cy="12" r="7" {...stroke} />
            <Circle cx="12" cy="12" r="2.5" fill={color} />
            <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" {...stroke} />
          </>
        );
      case 'cloudCheck':
        return (
          <>
            <Path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z" {...stroke} />
            <Path d="M9.5 13.5l2 2 3.5-3.5" {...stroke} />
          </>
        );
      case 'logout':
        return (
          <>
            <Path d="M15 4h4v16h-4" {...stroke} />
            <Path d="M10 8l-4 4 4 4M6 12h11" {...stroke} />
          </>
        );
    }
  })();

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {paths}
    </Svg>
  );
}
