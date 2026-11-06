import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/TabBar';
import { StatusChip } from '@/components/ui';
import { usePickups } from '@/data/pickups';
import { colors, fonts, type } from '@/theme';

// react-native-maps has no web version. In the browser build the Route Map tab lists the stops
// instead; the real map runs on Android and iOS.
export default function MapScreenWeb() {
  const { pickups } = usePickups();
  const tabInset = useTabBarInset();
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: tabInset }}>
        <Text style={type.screenTitle}>Today&apos;s route</Text>
        <Text style={styles.note}>The live map is available in the phone app.</Text>
        {pickups.map((p) => (
          <Pressable
            key={p.id}
            style={styles.row}
            onPress={() => router.push({ pathname: '/pickup/[id]', params: { id: p.id } })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.customer}>
                {p.stop}. {p.customer}
              </Text>
              <Text style={styles.note}>{p.address}</Text>
            </View>
            <StatusChip status={p.status} size="sm" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  note: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  customer: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
});
