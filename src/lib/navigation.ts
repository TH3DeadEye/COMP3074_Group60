import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';

import type { LatLng, Pickup } from '@/data/model';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

if (__DEV__ && !API_KEY) {
  console.warn('[maps] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set. ETAs will be estimates and the map may be blank.');
}


// The key is restricted to our Android app. Google checks these two headers on REST calls
// (the Routes API) to tell that the request comes from that app. The SHA-1 is the team's shared
// debug keystore (android/app/debug.keystore); a release build needs its own SHA-1 added to the key.
const ANDROID_PACKAGE = 'com.group60.dumplodriver';
const ANDROID_CERT_SHA1 = '5E8F16062EA3CD2C4A0D547876BAA6F38CABF625';

// ─── Turn-by-turn hand-off ────────────────────────────────────────────────────────────────────

function destinationOf(p: Pickup) {
  return p.coords
    ? `${p.coords.latitude},${p.coords.longitude}`
    : encodeURIComponent(`${p.address}, ${p.city}`);
}

/** Web link to directions. Opens the Google Maps app if it's installed, otherwise the browser. */
export function directionsUrl(p: Pickup) {
  return `https://www.google.com/maps/dir/?api=1&destination=${destinationOf(p)}&travelmode=driving`;
}

/**
 * Start driving directions to a pickup.
 * Android: straight into Google Maps navigation mode. If Google Maps isn't installed (or the
 * intent fails), falls back to the web directions link, which opens in the browser.
 */
export async function openNavigation(p: Pickup) {
  if (Platform.OS === 'android') {
    const intent = `google.navigation:q=${destinationOf(p)}&mode=d`;
    try {
      if (await Linking.canOpenURL(intent)) {
        await Linking.openURL(intent);
        return;
      }
    } catch {
      // fall through to the browser link
    }
  }
  await Linking.openURL(directionsUrl(p));
}

// ─── Distance and drive time ──────────────────────────────────────────────────────────────────

export type Eta = {
  meters: number;
  seconds: number;
  /** True when it's a straight-line estimate because the Routes API couldn't be reached. */
  approx: boolean;
};

/** Straight-line distance in metres. */
export function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// City streets are roughly 1.3× the straight line, at about 30 km/h for a truck.
function estimate(a: LatLng, b: LatLng): Eta {
  const meters = distanceMeters(a, b) * 1.3;
  return { meters, seconds: meters / (30_000 / 3600), approx: true };
}

/** Driving distance and time from the Routes API, with live traffic. */
export async function fetchEta(origin: LatLng, destination: LatLng, signal?: AbortSignal): Promise<Eta> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
  };
  if (Platform.OS === 'android') {
    headers['X-Android-Package'] = ANDROID_PACKAGE;
    headers['X-Android-Cert'] = ANDROID_CERT_SHA1;
  }
  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      origin: { location: { latLng: origin } },
      destination: { location: { latLng: destination } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    }),
  });
  if (!res.ok) throw new Error(`Routes API ${res.status}: ${await res.text()}`);
  const route = (await res.json()).routes?.[0];
  if (!route) throw new Error('Routes API returned no route');
  return { meters: route.distanceMeters ?? 0, seconds: parseInt(route.duration ?? '0', 10), approx: false };
}

// Only ask the Routes API again once the driver has moved this far, so a moving truck doesn't
// make a request every few seconds.
const REFETCH_AFTER_M = 300;

/**
 * Distance and drive time from the driver to a stop, for the next-stop card.
 * Shows a straight-line estimate at once, then replaces it with the Routes API answer.
 */
export function useEta(from: LatLng | undefined, to: LatLng | undefined): Eta | undefined {
  // The last Routes API answer and the stop it was for.
  const [routed, setRouted] = useState<{ to: LatLng; eta: Eta } | null>(null);
  const asked = useRef<{ from: LatLng; to: LatLng } | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  // Cancel a request still running when the screen goes away.
  useEffect(() => () => inFlight.current?.abort(), []);

  useEffect(() => {
    if (!from || !to || !API_KEY) {
      asked.current = null;
      return;
    }
    // Location updates arrive every 25 m. Only start a new request for a new stop or a big move;
    // otherwise let the request already running finish.
    const prev = asked.current;
    if (prev && sameSpot(prev.to, to) && distanceMeters(prev.from, from) < REFETCH_AFTER_M) return;
    asked.current = { from, to };

    inFlight.current?.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), 8000);
    fetchEta(from, to, ctrl.signal)
      .then((eta) => {
        if (inFlight.current === ctrl) setRouted({ to, eta });
      })
      .catch((e) => {
        // On failure the straight-line estimate below stays on screen.
        if (__DEV__ && inFlight.current === ctrl) console.warn('[eta]', e);
      })
      .finally(() => clearTimeout(timer));
  }, [from, to]);

  if (!from || !to) return undefined;
  if (routed && sameSpot(routed.to, to)) return routed.eta;
  return estimate(from, to);
}

const sameSpot = (a: LatLng, b: LatLng) => a.latitude === b.latitude && a.longitude === b.longitude;

export function formatEta(eta: Eta | undefined) {
  if (!eta) return { km: '–', min: '–' };
  const km = eta.meters / 1000;
  return {
    km: km < 10 ? km.toFixed(1) : String(Math.round(km)),
    min: String(Math.max(1, Math.round(eta.seconds / 60))),
  };
}
