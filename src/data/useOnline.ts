import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** False when the phone has no connection (airplane mode, no signal). Assumes online until told otherwise. */
export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    // Fires straight away with the current state, then on every change.
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return unsubscribe;
  }, []);
  return online;
}
