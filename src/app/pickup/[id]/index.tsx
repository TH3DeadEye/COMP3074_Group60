import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { Icon } from '@/components/Icon';
import { AppButton, Card, JobTag, LocationDot, StatusChip } from '@/components/ui';
import { driver, jobLabel, navigationUrl, usePickups } from '@/data/pickups';
import { colors, fonts, tabular, type } from '@/theme';

const MAP_W = 358;
const MAP_H = 150;

// Screen 3 · Pickup Details
export default function PickupDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pickups, getPickup } = usePickups();
  const insets = useSafeAreaInsets();
  const pickup = getPickup(id);

  if (!pickup) {
    return (
      <SafeAreaView style={[styles.screen, { alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
        <Text style={type.body}>Pickup not found.</Text>
        <AppButton label="Back to today" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const closed = pickup.status === 'completed' || pickup.status === 'cancelled';

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/today'))}
          style={styles.backButton}
        >
          <Icon name="back" size={24} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Pickup {pickup.id}</Text>
        <Text style={styles.headerMeta}>
          Stop {pickup.stop} of {pickups.length}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 8, paddingHorizontal: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <StatusChip status={pickup.status} />
            <JobTag job={pickup.job} />
          </View>
          <Text style={styles.customer} accessibilityRole="header">
            {pickup.customer}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="pin" size={18} color={colors.muted} />
            <Text style={styles.address}>
              {pickup.address}, {pickup.city}
            </Text>
          </View>
        </View>

        <View style={styles.mapPreview} accessibilityLabel="Map preview: pickup pin and your location">
          <Svg width="100%" height="100%" viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
            <Rect x="200" y="0" width="90" height="56" fill={colors.mapPark} />
            <Path d="M0 70 H358" stroke="#FFFFFF" strokeWidth={14} />
            <Path d="M0 122 H358" stroke="#FFFFFF" strokeWidth={8} />
            <Path d="M0 22 H358" stroke="#FFFFFF" strokeWidth={8} />
            <Path d="M96 0 V150" stroke="#FFFFFF" strokeWidth={12} />
            <Path d="M190 0 V150" stroke="#FFFFFF" strokeWidth={8} />
            <Path d="M300 0 V150" stroke="#FFFFFF" strokeWidth={8} />
            <Path d="M96 112 V70 H246" fill="none" stroke={colors.location} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <View style={[styles.pinAt, { left: `${(96 / MAP_W) * 100}%`, top: 112, marginLeft: -18, marginTop: -18 }]}>
            <LocationDot halo={8} />
          </View>
          <View style={[styles.pinAt, { left: `${(246 / MAP_W) * 100}%`, top: 54, marginLeft: -20, marginTop: -20 }]}>
            <View style={styles.previewPin}>
              <Text style={styles.previewPinText}>{pickup.stop}</Text>
            </View>
          </View>
        </View>

        <Card style={styles.factsGrid}>
          <Fact label="Window" value={pickup.window} />
          <Fact label="Job" value={jobLabel[pickup.job]} />
          <Fact label="Material" value={pickup.material} />
          <Fact label="Truck" value={`${driver.truck} · ${driver.truckType}`} />
        </Card>

        {pickup.note && (
          <View style={styles.note}>
            <Icon name="note" size={22} color={colors.noteInk} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.label, { fontSize: 12, color: colors.noteInk }]}>Dispatch note</Text>
              <Text style={styles.noteText}>{pickup.note}</Text>
            </View>
          </View>
        )}

        <View style={{ gap: 10 }}>
          <Text style={[type.sectionHeading, { marginTop: 4, marginHorizontal: 4 }]}>Status history</Text>
          <View style={{ gap: 14, paddingHorizontal: 4 }}>
            {pickup.history.map((h, i) => (
              <View key={`${h.title}-${i}`} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={[styles.timelineDot, i === 0 ? styles.timelineDotCurrent : styles.timelineDotPast]} />
                <View style={{ gap: 1, flex: 1 }}>
                  <Text style={styles.historyTitle}>{h.title}</Text>
                  <Text style={[styles.historyMeta, tabular]}>{h.meta}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 20 + insets.bottom }]}>
        <AppButton
          label="Navigate"
          icon="navigate"
          variant="hiVis"
          style={{ flex: 1 }}
          onPress={() => Linking.openURL(navigationUrl(pickup))}
        />
        <AppButton
          label="Update status"
          style={{ flex: 1 }}
          disabled={closed}
          onPress={() => router.push({ pathname: '/pickup/[id]/status', params: { id: pickup.id } })}
        />
      </View>
    </SafeAreaView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={[type.label, { fontSize: 12 }]}>{label}</Text>
      <Text style={[styles.factValue, tabular]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  header: {
    height: 64,
    paddingTop: 8,
    paddingLeft: 8,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButton: { width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  headerMeta: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
  content: { paddingTop: 4, paddingHorizontal: 16, paddingBottom: 20, gap: 16 },
  customer: { fontFamily: fonts.condBold, fontSize: 34, lineHeight: 36, color: colors.ink },
  address: { fontFamily: fonts.regular, fontSize: 17, color: colors.muted },
  mapPreview: {
    height: MAP_H,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.mapGround,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pinAt: { position: 'absolute' },
  previewPin: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.hiVis,
    borderWidth: 3,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPinText: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  factsGrid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  fact: { width: '50%', gap: 2, paddingRight: 12 },
  factValue: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  note: {
    backgroundColor: colors.note,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  noteText: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  timelineDot: { width: 12, height: 12, marginTop: 5, borderRadius: 999 },
  timelineDotCurrent: { backgroundColor: colors.ink },
  timelineDotPast: { borderWidth: 2, borderColor: '#8A8F96' },
  historyTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  historyMeta: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  footer: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
});
