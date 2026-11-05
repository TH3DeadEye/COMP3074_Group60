import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, fonts } from '@/theme';

const VISIBLE_MS = 2600; // from first frame until the fade-out starts
const VISIBLE_REDUCED_MS = 1500;
const FADE_OUT_MS = 450;

// Full-screen greeting shown right after sign-in or sign-up: the logo springs in, then the
// greeting and the driver's name slide up one after the other, then everything fades away.
// Tap anywhere to skip.
export function WelcomeOverlay({ firstName, isNew, onDone }: { firstName: string; isNew: boolean; onDone: () => void }) {
  const greeting = isNew ? 'Welcome' : 'Welcome back';

  const [root] = useState(() => new Animated.Value(1)); // whole overlay, used for the fade-out
  const [logo] = useState(() => new Animated.Value(0));
  const [label] = useState(() => new Animated.Value(0));
  const [name] = useState(() => new Animated.Value(0));
  const leaving = useRef(false);

  // Keep the latest callback without restarting the animation when its identity changes.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    Animated.timing(root, {
      toValue: 0,
      duration: FADE_OUT_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => onDoneRef.current());
  }, [root]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let entrance: Animated.CompositeAnimation | undefined;

    AccessibilityInfo.announceForAccessibility(`${greeting}, ${firstName}`);
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        // No movement: show everything at once.
        logo.setValue(1);
        label.setValue(1);
        name.setValue(1);
        timer = setTimeout(leave, VISIBLE_REDUCED_MS);
        return;
      }
      const slideIn = (value: Animated.Value, duration: number) =>
        Animated.timing(value, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });
      entrance = Animated.parallel([
        Animated.sequence([
          Animated.delay(100),
          Animated.spring(logo, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        ]),
        Animated.sequence([Animated.delay(450), slideIn(label, 500)]),
        Animated.sequence([Animated.delay(700), slideIn(name, 650)]),
      ]);
      entrance.start();
      timer = setTimeout(leave, VISIBLE_MS);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      entrance?.stop();
    };
  }, [firstName, greeting, leave, logo, label, name]);

  const rise = (value: Animated.Value, distance: number) =>
    value.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: root }]}>
      <Pressable
        onPress={leave}
        accessibilityRole="button"
        accessibilityLabel={`${greeting}, ${firstName}. Tap to continue.`}
        style={styles.screen}
      >
        <Animated.View
          style={[
            styles.logo,
            {
              opacity: logo.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: 'clamp' }),
              transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
            },
          ]}
        >
          <Icon name="truck" size={44} color={colors.ink} />
        </Animated.View>

        <Animated.Text style={[styles.greeting, { opacity: label, transform: [{ translateY: rise(label, 14) }] }]}>
          {greeting}
        </Animated.Text>
        <Animated.Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.name, { opacity: name, transform: [{ translateY: rise(name, 20) }] }]}
        >
          {firstName}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 6,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 26,
    backgroundColor: colors.hiVis,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    color: colors.hiVis,
  },
  name: {
    maxWidth: '100%',
    fontFamily: fonts.condBold,
    fontSize: 64,
    lineHeight: 68,
    color: colors.surface,
    textAlign: 'center',
  },
});
