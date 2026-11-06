import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type DimensionValue } from 'react-native';

import { colors } from '@/theme';

type Blob = {
  size: number;
  color: string;
  top?: DimensionValue;
  bottom?: DimensionValue;
  left?: DimensionValue;
  right?: DimensionValue;
  /** How far it wanders, in px, and how long one way takes. */
  drift: number;
  duration: number;
};

// Glass only looks like glass when there's something colorful behind it, so the sign-in screens
// get a few big shapes in the app's own colors that slowly drift under the card.
const BLOBS: Blob[] = [
  { size: 280, color: colors.hiVis, top: -70, right: -90, drift: 26, duration: 9000 },
  { size: 240, color: colors.location, top: 240, left: -120, drift: 22, duration: 11000 },
  { size: 200, color: colors.doneMarker, bottom: 40, right: -70, drift: 20, duration: 10000 },
];

/** `strength` is how bold the shapes are (0–1). Lower it where text sits on top of them. */
export function AuthBackdrop({ strength = 0.92 }: { strength?: number }) {
  const [values] = useState(() => BLOBS.map(() => new Animated.Value(0)));

  useEffect(() => {
    let cancelled = false;
    let loops: Animated.CompositeAnimation[] = [];
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled || reduceMotion) return; // shapes just stay still
      loops = values.map((value, i) => {
        const leg = (toValue: number) =>
          Animated.timing(value, {
            toValue,
            duration: BLOBS[i].duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          });
        return Animated.loop(Animated.sequence([leg(1), leg(0)]));
      });
      loops.forEach((loop) => loop.start());
    });
    return () => {
      cancelled = true;
      loops.forEach((loop) => loop.stop());
    };
  }, [values]);

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {BLOBS.map((blob, i) => {
        const { size, color, drift, duration: _duration, ...position } = blob;
        return (
          <Animated.View
            key={i}
            style={[
              {
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: strength,
                transform: [
                  { translateX: values[i].interpolate({ inputRange: [0, 1], outputRange: [-drift, drift] }) },
                  { translateY: values[i].interpolate({ inputRange: [0, 1], outputRange: [drift, -drift] }) },
                ],
              },
              position,
            ]}
          />
        );
      })}
    </View>
  );
}
