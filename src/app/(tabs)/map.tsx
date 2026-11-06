import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type MapStyleElement } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { useTabBarInset } from '@/components/TabBar';
import { AppButton, SheetHandle, StatusChip, StopMarker } from '@/components/ui';
import type { LatLng, Pickup } from '@/data/model';
import { usePickups } from '@/data/pickups';
import { locationProblem, useDriverLocation } from '@/lib/location';
import { formatEta, openNavigation, useEta } from '@/lib/navigation';
import { colors, fonts, tabular, type } from '@/theme';

// Downtown Toronto, used until the stops have loaded.
const START_REGION = { latitude: 43.6532, longitude: -79.3832, latitudeDelta: 0.12, longitudeDelta: 0.12 };

// Hide shops, transit and other points of interest so the stops stand out.
const MAP_STYLE: MapStyleElement[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

// Screen 4 · Route Map
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const { pickups, nextPickup } = usePickups();
  const { stop: focusId } = useLocalSearchParams<{ stop?: string }>();
  const { location, coords: me, fix } = useDriverLocation();
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [sheetH, setSheetH] = useState(260);
  const [selectedId, setSelectedId] = useState<string | undefined>(focusId);

  // Opening the map from a pickup's details selects that pickup.
  const [seenFocusId, setSeenFocusId] = useState(focusId);
  if (focusId !== seenFocusId) {
    setSeenFocusId(focusId);
    setSelectedId(focusId);
  }

  const selected = pickups.find((p) => p.id === selectedId) ?? nextPickup ?? pickups[pickups.length - 1];
  const doneCount = pickups.filter((p) => p.status === 'completed').length;
  const isNext = selected?.id === nextPickup?.id;
  const etaResult = useEta(me, selected?.coords);
  const eta = formatEta(etaResult);
  const problem = locationProblem(location);

  const stopCoords = useMemo(
    () => pickups.map((p) => p.coords).filter((c): c is LatLng => !!c),
    [pickups],
  );
  const padding = { top: insets.top + 110, right: 48, bottom: sheetH + 24, left: 48 };

  // Frame every stop, plus the driver if we know where they are.
  const fitAll = (withMe = true) => {
    const points = withMe && me ? [...stopCoords, me] : stopCoords;
    if (points.length) mapRef.current?.fitToCoordinates(points, { edgePadding: padding, animated: true });
  };

  // Arriving from a pickup's details centres on that pickup. Otherwise the first view frames all
  // of today's stops, once the map and the stops have both loaded.
  const focusCoords = pickups.find((p) => p.id === focusId)?.coords;
  const framed = useRef(false);
  useEffect(() => {
    if (!mapReady) return;
    if (focusCoords) {
      mapRef.current?.animateCamera({ center: focusCoords, zoom: 15 }, { duration: 500 });
      framed.current = true;
    } else if (!framed.current && stopCoords.length) {
      framed.current = true;
      fitAll();
    }
    // fitAll reads the latest padding and position; re-running for those would jump the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, focusCoords?.latitude, focusCoords?.longitude, stopCoords.length]);

  const recentre = () => {
    setSelectedId(undefined);
    if (me) mapRef.current?.animateCamera({ center: me, zoom: 15 }, { duration: 500 });
    else fitAll(false);
  };

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={START_REGION}
        customMapStyle={MAP_STYLE}
        showsUserLocation={location.state === 'ready'}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        mapPadding={{ top: 0, right: 0, bottom: sheetH, left: 0 }}
        onMapReady={() => setMapReady(true)}
        accessibilityLabel="Map of today's stops"
      >
        {pickups.map((p) =>
          p.coords ? (
            <StopPin
              // A new key when the look changes remounts the pin, so Google Maps redraws it.
              key={`${p.id}-${p.status}-${p.id === nextPickup?.id}`}
              pickup={p}
              coords={p.coords}
              isNext={p.id === nextPickup?.id}
              onPress={() => setSelectedId(p.id)}
            />
          ) : null,
        )}
      </MapView>

      <View style={[styles.topBar, { top: insets.top + 16 }]} pointerEvents="box-none">
        <View style={styles.titleCard}>
          <Text style={styles.title} accessibilityRole="header">
            Today&apos;s route
          </Text>
          <Text style={styles.titleMeta}>
            {pickups.length} stops · {doneCount} done
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={me ? 'Re-centre on my location' : 'Show all stops'}
          onPress={recentre}
          style={({ pressed }) => [styles.locateButton, pressed && { opacity: 0.8 }]}
        >
          <Icon name="locate" size={24} color={colors.location} />
        </Pressable>
      </View>

      {problem && (
        <View style={[styles.banner, { top: insets.top + 96 }]}>
          <Text style={styles.bannerText}>{problem}</Text>
          <Pressable accessibilityRole="button" onPress={fix} hitSlop={8}>
            <Text style={styles.bannerAction}>Turn on</Text>
          </Pressable>
        </View>
      )}

      {selected && (
        // The glass tab bar floats over the bottom of the sheet, so the sheet's content stops above it.
        <View
          style={[styles.sheet, { paddingBottom: tabInset }]}
          onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
          accessibilityLabel={isNext ? 'Next stop' : 'Selected stop'}
        >
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
          {me && selected.coords ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'baseline', gap: 18 }}
              accessibilityLabel={`${eta.km} kilometres, about ${eta.min} minutes`}
            >
              <Text style={[styles.distance, tabular]}>{eta.km} km</Text>
              <Text style={[styles.distance, tabular]}>~{eta.min} min</Text>
              {etaResult?.approx && <Text style={styles.approx}>estimate</Text>}
            </View>
          ) : (
            <Text style={styles.address}>Turn on location to see the distance.</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AppButton
              label="Start navigation"
              icon="navigate"
              variant="hiVis"
              style={{ flex: 1 }}
              onPress={() => openNavigation(selected)}
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

// A numbered stop on the map. Google Maps draws custom markers as a still image, so a new pin
// tracks changes only for its first moment (to capture the fonts and icon), then stops; otherwise
// it redraws every frame and the map stutters. The parent's key remounts it when its look changes.
function StopPin({
  pickup,
  coords,
  isNext,
  onPress,
}: {
  pickup: Pickup;
  coords: LatLng;
  isNext: boolean;
  onPress: () => void;
}) {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <Marker
      coordinate={coords}
      onPress={onPress}
      tracksViewChanges={tracks}
      // Anchor on the centre of the circle, which sits under the "Next" label when there is one.
      anchor={{ x: 0.5, y: isNext ? 60 / 84 : 0.5 }}
      zIndex={isNext ? 10 : 1}
      accessibilityLabel={`Stop ${pickup.stop}, ${pickup.customer}`}
    >
      <View style={{ alignItems: 'center' }}>
        {isNext && (
          <View style={styles.nextLabel}>
            <Text style={styles.nextLabelText} numberOfLines={1}>
              Next · {pickup.customer.split(' ')[0]}
            </Text>
          </View>
        )}
        <StopMarker pickup={pickup} isNext={isNext} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mapGround, overflow: 'hidden' },
  nextLabel: {
    height: 28,
    marginBottom: 8,
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
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.ink,
  },
  bannerText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.surface },
  bannerAction: { fontFamily: fonts.bold, fontSize: 15, color: colors.hiVis },
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
  approx: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
});
