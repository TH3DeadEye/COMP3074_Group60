import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/Glass';
import { colors, fonts } from '@/theme';
import { Icon, type IconName } from './Icon';

const tabs: Record<string, { label: string; icon: IconName }> = {
  today: { label: 'Today', icon: 'list' },
  map: { label: 'Map', icon: 'map' },
  profile: { label: 'Profile', icon: 'user' },
};

const BAR_HEIGHT = 68;
const MIN_GAP = 12; // space between the bar and the bottom edge, on phones with no home indicator

/**
 * The bar floats over the screens instead of taking up space, so every tab screen has to leave
 * this much room at the bottom of its content. Pass it as bottom padding.
 */
export function useTabBarInset() {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + Math.max(insets.bottom, MIN_GAP) + 12;
}

// A floating glass bar over the content (liquid glass on iOS 26+, a frosted white panel elsewhere).
// The hi-vis pill still marks the active tab.
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    // Absolutely positioned so the screens underneath fill the whole display and scroll behind it.
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, MIN_GAP) }]}>
      <Glass
        style={styles.bar}
        scheme="light"
        tint="rgba(255, 255, 255, 0.45)"
        fallbackColor="rgba(255, 255, 255, 0.97)"
        fallbackBorder={colors.line}
      >
        {state.routes.map((route, index) => {
          const tab = tabs[route.name];
          if (!tab) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.item}
            >
              <View style={[styles.pill, focused && { backgroundColor: colors.hiVis }]}>
                <Icon name={tab.icon} size={22} color={focused ? colors.ink : colors.muted} />
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: focused ? fonts.bold : fonts.medium,
                  color: focused ? colors.ink : colors.muted,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  bar: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pill: {
    width: 64,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
