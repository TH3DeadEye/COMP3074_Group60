import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';
import { Icon, type IconName } from './Icon';

const tabs: Record<string, { label: string; icon: IconName }> = {
  today: { label: 'Today', icon: 'list' },
  map: { label: 'Map', icon: 'map' },
  profile: { label: 'Profile', icon: 'user' },
};

// MD3-style bottom navigation: a hi-vis pill marks the active tab.
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: 80 + insets.bottom }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
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
