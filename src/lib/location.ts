import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

import type { LatLng } from '@/data/model';

export type DriverLocation =
  | { state: 'loading' }
  /** The driver said no. If canAskAgain is false, only the system settings can turn it back on. */
  | { state: 'denied'; canAskAgain: boolean }
  /** Permission is fine but location services (GPS) are switched off on the phone. */
  | { state: 'off' }
  | { state: 'ready'; coords: LatLng; accuracy: number | null };

// Moving 25 m or waiting 10 s gives a fresh position. That is plenty for a truck on city streets
// and keeps the battery use low.
const WATCH: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  distanceInterval: 25,
  timeInterval: 10_000,
};

const toLatLng = (p: Location.LocationObject): LatLng => ({
  latitude: p.coords.latitude,
  longitude: p.coords.longitude,
});

/**
 * The driver's live position while the screen is mounted.
 * Asks for "while using the app" permission the first time, then follows the phone's position.
 */
export function useDriverLocation() {
  const [location, setLocation] = useState<DriverLocation>({ state: 'loading' });
  const sub = useRef<Location.LocationSubscription | null>(null);
  // Each start() gets a number; a start() that finishes after a newer one (or after unmount) quits.
  const run = useRef(0);

  /** ask: show the permission prompt. False only checks, so returning to the app never re-prompts. */
  const start = useCallback(async (ask: boolean) => {
    const me = ++run.current;
    const stale = () => me !== run.current;
    sub.current?.remove();
    sub.current = null;

    const perm = ask
      ? await Location.requestForegroundPermissionsAsync()
      : await Location.getForegroundPermissionsAsync();
    if (stale()) return;
    if (perm.status !== 'granted') {
      setLocation({ state: 'denied', canAskAgain: perm.canAskAgain });
      return;
    }
    if (!(await Location.hasServicesEnabledAsync())) {
      if (!stale()) setLocation({ state: 'off' });
      return;
    }

    // Show the last known fix straight away; the watch below replaces it with a fresh one.
    const last = await Location.getLastKnownPositionAsync().catch(() => null);
    if (stale()) return;
    if (last) setLocation({ state: 'ready', coords: toLatLng(last), accuracy: last.coords.accuracy });

    try {
      const watch = await Location.watchPositionAsync(WATCH, (p) =>
        setLocation({ state: 'ready', coords: toLatLng(p), accuracy: p.coords.accuracy }),
      );
      if (stale()) watch.remove();
      else sub.current = watch;
    } catch {
      if (!last && !stale()) setLocation({ state: 'off' });
    }
  }, []);

  useEffect(() => {
    // start() only sets state after it has awaited the permission check.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    start(true);
    // Coming back from the settings app is when a driver has just turned location on. Closing the
    // Android permission dialog also lands here, so this path checks without asking again.
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') start(false);
    });
    return () => {
      appState.remove();
      // A counter, not a rendered node, so reading it at cleanup time is what we want.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      run.current++;
      sub.current?.remove();
    };
  }, [start]);

  /** Ask again if the phone still allows it, otherwise open the app's settings page. */
  const fix = useCallback(async () => {
    if (location.state === 'denied' && !location.canAskAgain) {
      await Linking.openSettings();
    } else if (location.state === 'off') {
      await Location.enableNetworkProviderAsync().catch(() => Linking.openSettings());
      await start(false);
    } else {
      await start(true);
    }
  }, [location, start]);

  return { location, coords: location.state === 'ready' ? location.coords : undefined, fix };
}

export function locationProblem(l: DriverLocation): string | undefined {
  if (l.state === 'denied') return 'Location is off for DUMPLO. Turn it on to see yourself on the map.';
  if (l.state === 'off') return "Your phone's location is switched off.";
  return undefined;
}
