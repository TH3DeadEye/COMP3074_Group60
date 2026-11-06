import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useState } from 'react';
import { Platform, StyleSheet, View, type ColorValue, type ViewProps } from 'react-native';

type Lib = typeof import('@uginy/react-native-liquid-glass');

// Android's glass: a GPU shader (refraction, edge glow) from @uginy/react-native-liquid-glass.
// It is native code, so it only exists inside a development build, never in Expo Go; and the
// shader needs Android 13 (API 33). It also runs its native setup the moment it is imported, so
// the checks happen BEFORE the require. Anywhere they fail, Glass uses its plain translucent panel.
function loadLib(): Lib | null {
  if (Platform.OS !== 'android' || typeof Platform.Version !== 'number' || Platform.Version < 33) return null;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null; // Expo Go
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@uginy/react-native-liquid-glass') as Lib;
  } catch {
    return null; // e.g. a development build made before this library was added
  }
}

const lib = loadLib();

export const ANDROID_GLASS_AVAILABLE = lib !== null;

// The library takes "#rrggbb" or "rgb(r,g,b)" and has no alpha, so split a translucent tint
// into its color and its opacity.
function parseTint(tint: ColorValue | undefined, scheme: 'light' | 'dark' | 'auto') {
  if (typeof tint === 'string') {
    const m = tint.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
    if (m) return { color: `rgb(${m[1]},${m[2]},${m[3]})`, alpha: m[4] !== undefined ? Number(m[4]) : undefined };
    return { color: tint, alpha: undefined };
  }
  return { color: scheme === 'dark' ? '#15171A' : '#FFFFFF', alpha: undefined };
}

type Props = ViewProps & {
  effect: 'regular' | 'clear';
  scheme: 'light' | 'dark' | 'auto';
  tint?: ColorValue;
};

export function AndroidGlass({ effect, scheme, tint, style, children, ...rest }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  if (!lib) return null;

  const radius = StyleSheet.flatten(style)?.borderRadius;
  const cornerRadius = typeof radius === 'number' ? radius : 24;
  const { color, alpha } = parseTint(tint, scheme);
  const preset = effect === 'clear' ? lib.LIQUID_GLASS_CRYSTAL : lib.LIQUID_GLASS_FROSTED;

  return (
    <View
      {...rest}
      style={[style, { overflow: 'hidden' }]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size.w > 0 && size.h > 0 && (
        // The library sizes itself from its own style, so measure our container and hand it
        // the exact size, then park it behind the content.
        <View pointerEvents="none" style={styles.layer}>
          <lib.LiquidGlassView
            {...preset}
            tintColor={color}
            glassOpacity={alpha ?? (effect === 'clear' ? 0.06 : scheme === 'dark' ? 0.4 : 0.45)}
            cornerRadius={cornerRadius}
            shadowOpacity={0}
            style={{ width: size.w, height: size.h, borderRadius: cornerRadius }}
          />
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0 },
});
