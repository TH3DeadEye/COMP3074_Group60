import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import {
  BarlowSemiCondensed_600SemiBold,
  BarlowSemiCondensed_700Bold,
} from '@expo-google-fonts/barlow-semi-condensed';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionOverlay } from '@/components/SessionOverlay';
import { AuthProvider, useAuth } from '@/data/auth';
import { PickupsProvider } from '@/data/pickups';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { user, initializing, welcome, dismissWelcome, farewell, dismissFarewell } = useAuth();
  const [fontsLoaded] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BarlowSemiCondensed_600SemiBold,
    BarlowSemiCondensed_700Bold,
  });

  // Wait for the saved session to be restored so a signed-in driver doesn't flash the login screen.
  if (!fontsLoaded || initializing) return null;

  return (
    <PickupsProvider>
      <StatusBar style={welcome || farewell ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
        {/* Signed out: only the login screen. Signing in/out swaps the groups and the router redirects. */}
        <Stack.Protected guard={!user}>
          <Stack.Screen name="index" />
          <Stack.Screen name="signup" />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="pickup/[id]/index" />
          <Stack.Screen
            name="pickup/[id]/status"
            options={{
              presentation: 'transparentModal',
              animation: 'fade',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
        </Stack.Protected>
      </Stack>
      {/* Drawn over the app, in the same render that signs the user in or out, so no screen flashes first. */}
      {welcome ? (
        <SessionOverlay key="welcome" variant="welcome" firstName={welcome.firstName} isNew={welcome.isNew} onDone={dismissWelcome} />
      ) : farewell ? (
        <SessionOverlay key="goodbye" variant="goodbye" firstName={farewell.firstName} onDone={dismissFarewell} />
      ) : null}
    </PickupsProvider>
  );
}
