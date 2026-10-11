import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { Icon } from '@/components/Icon';
import { AppButton, LocationDot, SheetHandle, StatusChip, StopMarker } from '@/components/ui';
import { navigationUrl, usePickups, type Pickup } from '@/data/pickups';
import { colors, fonts, tabular, type } from '@/theme';

// Static mock map drawn in a 390×764 design space and stretched to fit the screen.
const MAP_W = 390;
const MAP_H = 764;
const ME = { x: 150, y: 400 };

// Rough mock distance from the driver's dot, so each stop shows plausible numbers.
function eta(p: Pickup) {
  const km = (Math.abs(p.map.x - ME.x) + Math.abs(p.map.y - ME.y)) * 0.0228;
  return { km: km.toFixed(1), min: Math.max(2, Math.round(km * 2.6)) };
}

// Screen 4 · Route Map
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { pickups, nextPickup } = usePickups();
  const [size, setSize] = useState({ w: MAP_W, h: MAP_H });
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const selected = pickups.find((p) => p.id === selectedId) ?? nextPickup ?? pickups[pickups.length - 1];
  const doneCount = pickups.filter((p) => p.status === 'completed').length;
  const sx = size.w / MAP_W;
  const sy = size.h / MAP_H;
  const isNext = selected?.id === nextPickup?.id;

  return (
    <View style={styles.screen}>
      <View
        style={StyleSheet.absoluteFill}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        accessibilityLabel="Map of today's stops"
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="none">
          <Rect x="166" y="122" width="82" height="96" rx="6" fill={colors.mapPark} />
          <Rect x="0" y="470" width="130" height="80" rx="6" fill={colors.mapWater} />
          <Path d="M0 110 H390" stroke="#FFFFFF" strokeWidth={10} />
          <Path d="M0 230 H390" stroke="#FFFFFF" strokeWidth={16} />
          <Path d="M0 330 H390" stroke="#FFFFFF" strokeWidth={10} />
          <Path d="M130 450 H390" stroke="#FFFFFF" strokeWidth={8} />
          <Path d="M0 600 H390" stroke="#FFFFFF" strokeWidth={10} />
          <Path d="M40 0 V470" stroke="#FFFFFF" strokeWidth={8} />
          <Path d="M150 0 V764" stroke="#FFFFFF" strokeWidth={16} />
          <Path d="M260 0 V764" stroke="#FFFFFF" strokeWidth={10} />
          <Path d="M345 0 V764" stroke="#FFFFFF" strokeWidth={8} />
          <Path d="M0 700 L390 380" stroke="#FFFFFF" strokeWidth={10} />
          {selected && (
            <Path
              d={`M${ME.x} ${ME.y} V${selected.map.y} H${selected.map.x}`}
              fill="none"
              stroke={colors.location}
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>

        <View style={[styles.abs, { left: ME.x * sx - 22, top: ME.y * sy - 22 }]}>
          <LocationDot />
        </View>

        {pickups.map((p) => {
          const next = p.id === nextPickup?.id;
          const half = next ? 24 : 18;
          return (
            <View key={p.id} style={[styles.abs, { left: p.map.x * sx - half, top: p.map.y * sy - half }]}>
              {next && (
                <View style={styles.nextLabel}>
                  <Text style={styles.nextLabelText} numberOfLines={1}>
                    Next · {p.customer.split(' ')[0]}
                  </Text>
                </View>
              )}
              <StopMarker pickup={p} isNext={next} onPress={() => setSelectedId(p.id)} />
            </View>
          );
        })}
      </View>

      <View style={[styles.topBar, { top: insets.top + 16 }]} pointerEvents="box-none">
        <View style={styles.titleCard}>
          <Text style={styles.title} accessibilityRole="header">
            Today's route
          </Text>
          <Text style={styles.titleMeta}>
            {pickups.length} stops · {doneCount} done
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Re-centre on my location"
          onPress={() => setSelectedId(undefined)}
          style={({ pressed }) => [styles.locateButton, pressed && { opacity: 0.8 }]}
        >
          <Icon name="locate" size={24} color={colors.location} />
        </Pressable>
      </View>

      {selected && (
        <View style={styles.sheet} accessibilityLabel={isNext ? 'Next stop' : 'Selected stop'}>
          <SheetHandle />
          <View style={styles.rowBetween}>
            <Text style={type.label}>
              {isNext ? 'Next stop' : 'Stop'} · {selected.stop} of {pickups.length}
            </Text>
            <StatusChip status={selected.status} size="sm" />
          </View>
          <View style={{ gap: 2 }}>
            <Text style={styles.customer}>{selected.customer}</Text>
            <Text style={[styles.address, tabular]}>
              {selected.address} · {selected.window}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 18 }}>
            <Text style={[styles.distance, tabular]}>{eta(selected).km} km</Text>
            <Text style={[styles.distance, tabular]}>~{eta(selected).min} min</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AppButton
              label="Start navigation"
              icon="navigate"
              variant="hiVis"
              style={{ flex: 1 }}
              onPress={() => Linking.openURL(navigationUrl(selected))}
            />
            <AppButton
              label="Details"
              variant="outline"
              onPress={() => router.push({ pathname: '/pickup/[id]', params: { id: selected.id } })}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mapGround, overflow: 'hidden' },
  abs: { position: 'absolute', alignItems: 'center' },
  nextLabel: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 8,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.ink,
    justifyContent: 'center',
  },
  nextLabelText: { fontFamily: fonts.bold, fontSize: 13, color: colors.surface },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  title: { fontFamily: fonts.condBold, fontSize: 22, lineHeight: 25, color: colors.ink },
  titleMeta: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  locateButton: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  customer: { fontFamily: fonts.condBold, fontSize: 28, lineHeight: 31, color: colors.ink },
  address: { fontFamily: fonts.regular, fontSize: 16, color: colors.muted },
  distance: { fontFamily: fonts.condBold, fontSize: 30, color: colors.distance },
});
