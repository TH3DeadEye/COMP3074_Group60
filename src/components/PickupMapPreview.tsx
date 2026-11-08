import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import type { Pickup } from '@/data/model';
import { useDriverLocation } from '@/lib/location';
import { colors, fonts } from '@/theme';

const HEIGHT = 150;

/**
 * Small, non-interactive map on Pickup Details: the pickup's pin and the driver's position.
 * Tapping it opens the full Route Map on this pickup.
 */
export function PickupMapPreview({ pickup, onPress }: { pickup: Pickup; onPress: () => void }) {
  const mapRef = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [pinTracks, setPinTracks] = useState(true);
  const { location, coords: me } = useDriverLocation();
  const target = pickup.coords;

  // Fit the pickup and the driver together once the driver's position is known.
  const haveMe = !!me;
  useEffect(() => {
    if (!ready || !target || !me) return;
    mapRef.current?.fitToCoordinates([target, me], {
      edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
      animated: false,
    });
    // Only frame once per pickup, not on every location update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, target?.latitude, target?.longitude, haveMe]);

  useEffect(() => {
    const t = setTimeout(() => setPinTracks(false), 700);
    return () => clearTimeout(t);
  }, []);

  if (!target) {
    return (
      <View style={[styles.box, styles.empty]}>
        <Text style={styles.emptyText}>No map position for this pickup.</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Map preview: pickup pin and your location. Opens the route map."
      style={styles.box}
    >
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...target, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
        showsUserLocation={location.state === 'ready'}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onMapReady={() => setReady(true)}
        // The Pressable around the map handles the tap.
        pointerEvents="none"
      >
        <Marker coordinate={target} tracksViewChanges={pinTracks} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.pin}>
            <Text style={styles.pinText}>{pickup.stop}</Text>
          </View>
        </Marker>
      </MapView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    height: HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.mapGround,
    borderWidth: 1,
    borderColor: colors.line,
  },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.hiVis,
    borderWidth: 3,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
});
