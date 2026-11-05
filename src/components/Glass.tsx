import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, View, type ColorValue, type ViewProps } from 'react-native';

import { ANDROID_GLASS_AVAILABLE, AndroidGlass } from './AndroidGlass';

// iOS gets Apple's real liquid glass (iOS 26 or later). Android 13+ in a development build gets
// a shader-based version. Everywhere else (Expo Go, older OS versions) we draw a plain
// translucent panel with the same shape instead.
const GLASS_SUPPORTED = isLiquidGlassAvailable();

// Reduce Transparency is an iOS accessibility setting; people who turn it on should get a solid panel.
function useReduceTransparency() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (mounted) setReduce(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

type GlassProps = ViewProps & {
  /** 'regular' is frosted; 'clear' is more see-through and needs a busy background. */
  effect?: 'regular' | 'clear';
  /** Pick the glass's light or dark look instead of letting it adapt to what's behind it. */
  scheme?: 'light' | 'dark' | 'auto';
  /** Colors the glass (iOS only). Keep it translucent. */
  tint?: ColorValue;
  /** Makes the glass respond to touch (for tappable surfaces). */
  interactive?: boolean;
  /** The panel used where real glass isn't available. Should be mostly opaque so text stays readable. */
  fallbackColor: ColorValue;
  fallbackBorder?: ColorValue;
};

export function Glass({
  effect = 'regular',
  scheme = 'auto',
  tint,
  interactive = false,
  fallbackColor,
  fallbackBorder,
  style,
  children,
  ...rest
}: GlassProps) {
  const reduceTransparency = useReduceTransparency();

  if (GLASS_SUPPORTED && !reduceTransparency) {
    return (
      <GlassView
        {...rest}
        style={style}
        glassEffectStyle={effect}
        colorScheme={scheme}
        tintColor={tint}
        isInteractive={interactive}
      >
        {children}
      </GlassView>
    );
  }

  if (ANDROID_GLASS_AVAILABLE && !reduceTransparency) {
    return (
      <AndroidGlass {...rest} style={style} effect={effect} scheme={scheme} tint={tint}>
        {children}
      </AndroidGlass>
    );
  }

  return (
    <View
      {...rest}
      style={[
        style,
        { backgroundColor: fallbackColor },
        fallbackBorder ? { borderWidth: 1, borderColor: fallbackBorder } : null,
      ]}
    >
      {children}
    </View>
  );
}
