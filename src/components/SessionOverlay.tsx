import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { colors, fonts } from '@/theme';

const FADE_IN_MS = 220;
const FADE_OUT_MS = 450;

type Look = {
  icon: IconName;
  label: string;
  title: string;
  titleSize: number;
  titleLines: number;
  /** Fade in over whatever is on screen (sign-out), or start fully opaque (sign-in, which swaps screens under it). */
  fadeIn: boolean;
  /** From first frame until the fade-out starts. */
  visibleMs: number;
  reducedMs: number;
  announce: string;
};

function lookFor(variant: 'welcome' | 'goodbye', firstName: string, isNew: boolean): Look {
  if (variant === 'goodbye') {
    return {
      icon: 'check',
      label: `See you soon, ${firstName}`,
      title: 'Successfully logged out',
      titleSize: 46,
      titleLines: 2,
      fadeIn: true,
      visibleMs: 2200,
      reducedMs: 1500,
      announce: 'Successfully logged out',
    };
  }
  const greeting = isNew ? 'Welcome' : 'Welcome back';
  return {
    icon: 'truck',
    label: greeting,
    title: firstName,
    titleSize: 64,
    titleLines: 1,
    fadeIn: false,
    visibleMs: 2600,
    reducedMs: 1500,
    announce: `${greeting}, ${firstName}`,
  };
}

// Full-screen message shown right after signing in, creating an account or signing out: the icon
// springs in, then the label and the title slide up one after the other, then everything fades
// away. Tap anywhere to skip.
export function SessionOverlay({
  variant,
  firstName,
  isNew = false,
  onDone,
}: {
  variant: 'welcome' | 'goodbye';
  firstName: string;
  isNew?: boolean;
  onDone: () => void;
}) {
  const { icon, label: labelText, title: titleText, titleSize, titleLines, fadeIn, visibleMs, reducedMs, announce } =
    lookFor(variant, firstName, isNew);

  const [root] = useState(() => new Animated.Value(fadeIn ? 0 : 1)); // whole overlay, for fade in/out
  const [logo] = useState(() => new Animated.Value(0));
  const [label] = useState(() => new Animated.Value(0));
  const [title] = useState(() => new Animated.Value(0));
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

    AccessibilityInfo.announceForAccessibility(announce);
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        // No movement: show everything at once.
        root.setValue(1);
        logo.setValue(1);
        label.setValue(1);
        title.setValue(1);
        timer = setTimeout(leave, reducedMs);
        return;
      }
      const slideIn = (value: Animated.Value, duration: number) =>
        Animated.timing(value, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });
      entrance = Animated.parallel([
        ...(fadeIn ? [Animated.timing(root, { toValue: 1, duration: FADE_IN_MS, useNativeDriver: true })] : []),
        Animated.sequence([
          Animated.delay(100),
          Animated.spring(logo, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        ]),
        Animated.sequence([Animated.delay(450), slideIn(label, 500)]),
        Animated.sequence([Animated.delay(700), slideIn(title, 650)]),
      ]);
      entrance.start();
      timer = setTimeout(leave, visibleMs);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      entrance?.stop();
    };
  }, [announce, fadeIn, visibleMs, reducedMs, leave, root, logo, label, title]);

  const rise = (value: Animated.Value, distance: number) =>
    value.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: root }]}>
      <Pressable
        onPress={leave}
        accessibilityRole="button"
        accessibilityLabel={`${announce}. Tap to continue.`}
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
          <Icon name={icon} size={44} color={colors.ink} strokeWidth={icon === 'check' ? 3 : undefined} />
        </Animated.View>

        <Animated.Text style={[styles.label, { opacity: label, transform: [{ translateY: rise(label, 14) }] }]}>
          {labelText}
        </Animated.Text>
        <Animated.Text
          numberOfLines={titleLines}
          adjustsFontSizeToFit
          style={[
            styles.title,
            { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.06), opacity: title, transform: [{ translateY: rise(title, 20) }] },
          ]}
        >
          {titleText}
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
  label: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    color: colors.hiVis,
    textAlign: 'center',
  },
  title: {
    maxWidth: '100%',
    fontFamily: fonts.condBold,
    color: colors.surface,
    textAlign: 'center',
  },
});
