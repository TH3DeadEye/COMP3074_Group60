import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { AppButton, Card, JobTag, ProgressSegments, StatusChip } from '@/components/ui';
import { driver, navigationUrl, usePickups, type Pickup } from '@/data/pickups';
import { colors, fonts, tabular, type } from '@/theme';

// Screen 2 · Today's Pickups
export default function TodayScreen() {
  const { pickups, nextPickup, refresh } = usePickups();
  const [syncing, setSyncing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const done = pickups.filter((p) => p.status === 'completed');
  const missed = pickups.filter((p) => p.status === 'missed');
  const closed = pickups.filter((p) => p.status === 'cancelled');
  const later = pickups.filter(
    (p) => p.id !== nextPickup?.id && (p.status === 'scheduled' || p.status === 'in_progress'),
  );
  const toGo = pickups.length - done.length - missed.length - closed.length;

  const onRefresh = () => {
    setSyncing(true);
    setTimeout(() => {
      refresh();
      setSyncing(false);
    }, 700);
  };

  const openPickup = (p: Pickup) => router.push({ pathname: '/pickup/[id]', params: { id: p.id } });

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <View style={{ gap: 2 }}>
          <Text style={styles.subtitle}>
            {driver.date} · Truck {driver.truck}
          </Text>
          <Text style={type.screenTitle} accessibilityRole="header">
            Today
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View style={[styles.syncChip, syncing && { backgroundColor: '#E6E8EC' }]}>
            <Icon
              name={syncing ? 'refresh' : 'check'}
              size={16}
              color={syncing ? '#3A4250' : colors.success}
              strokeWidth={2.2}
            />
            <Text style={[styles.syncText, syncing && { color: '#3A4250' }]}>{syncing ? 'Syncing' : 'Synced'}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh pickups"
            onPress={onRefresh}
            style={({ pressed }) => [styles.roundButton, pressed && { opacity: 0.7 }]}
          >
            <Icon name="refresh" size={22} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <View style={styles.progress}>
        <View style={styles.progressText}>
          <Text style={[styles.progressStrong, tabular]}>
            {done.length} of {pickups.length} done
          </Text>
          <Text style={[styles.progressMuted, tabular]}>
            {toGo} to go · {missed.length} missed
          </Text>
        </View>
        <ProgressSegments pickups={pickups} nextId={nextPickup?.id} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {nextPickup ? (
          <View style={styles.upNext} accessibilityLabel="Up next">
            <View style={styles.rowBetween}>
              <Text style={styles.upNextLabel}>
                {nextPickup.status === 'in_progress' ? 'On site' : 'Up next'} · Stop {nextPickup.stop}
              </Text>
              <JobTag job={nextPickup.job} onInk />
            </View>
            <View style={{ gap: 2 }}>
              <Text style={[styles.upNextWindow, tabular]}>{nextPickup.window}</Text>
              <Text style={styles.upNextCustomer}>{nextPickup.customer}</Text>
              <Text style={styles.upNextAddress}>
                {nextPickup.address} · {nextPickup.material}
              </Text>
            </View>
            {nextPickup.note && (
              <View style={styles.upNextNote}>
                <Icon name="note" size={20} color={colors.hiVis} />
                <Text style={styles.upNextNoteText}>
                  <Text style={{ color: colors.hiVis, fontFamily: fonts.bold }}>Note:</Text> {nextPickup.note}
                </Text>
              </View>
            )}
            <View style={styles.twoCol}>
              <AppButton
                label="Navigate"
                icon="navigate"
                variant="hiVis"
                style={{ flex: 1 }}
                onPress={() => Linking.openURL(navigationUrl(nextPickup))}
              />
              <AppButton
                label="Open"
                variant="outlineOnInk"
                style={{ flex: 1 }}
                onPress={() => openPickup(nextPickup)}
              />
            </View>
          </View>
        ) : (
          <Card style={styles.allDone}>
            <Icon name="check" size={28} color="#17663A" strokeWidth={2.8} />
            <Text style={styles.allDoneTitle}>All stops handled</Text>
            <Text style={styles.progressMuted}>Head back to the yard when you&apos;re ready.</Text>
          </Card>
        )}

        {later.length > 0 && (
          <>
            <Text style={[type.sectionHeading, { marginTop: 6, marginHorizontal: 4 }]}>Later today</Text>
            <Card>
              {later.map((p, i) => (
                <PickupRow key={p.id} pickup={p} last={i === later.length - 1} onPress={() => openPickup(p)} />
              ))}
            </Card>
          </>
        )}

        {missed.length > 0 && (
          <>
            <Text style={[type.sectionHeading, { marginTop: 6, marginHorizontal: 4 }]}>Missed</Text>
            <Card>
              {missed.map((p, i) => (
                <PickupRow key={p.id} pickup={p} last={i === missed.length - 1} onPress={() => openPickup(p)} />
              ))}
            </Card>
          </>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showCompleted }}
          onPress={() => setShowCompleted((v) => !v)}
          style={styles.completedBar}
        >
          <View style={styles.inlineRow}>
            <Icon name="check" size={20} color="#17663A" strokeWidth={2.4} />
            <Text style={styles.completedText}>Completed · {done.length}</Text>
          </View>
          <View style={[styles.inlineRow, { gap: 4 }]}>
            <Text style={styles.completedText}>{showCompleted ? 'Hide' : 'Show'}</Text>
            <Icon name={showCompleted ? 'chevronUp' : 'chevronDown'} size={18} color="#17663A" strokeWidth={2.2} />
          </View>
        </Pressable>

        {showCompleted && done.length > 0 && (
          <Card>
            {done.map((p, i) => (
              <PickupRow key={p.id} pickup={p} last={i === done.length - 1} onPress={() => openPickup(p)} />
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PickupRow({ pickup, last, onPress }: { pickup: Pickup; last: boolean; onPress: () => void }) {
  const done = pickup.status === 'completed';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Stop ${pickup.stop}, ${pickup.customer}, ${pickup.window}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.divider },
        pressed && { backgroundColor: '#F7F6F2' },
      ]}
    >
      <View style={[styles.stopBadge, done && { backgroundColor: colors.doneMarker }]}>
        <Text style={styles.stopBadgeText}>{pickup.stop}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text style={[styles.rowMeta, tabular]}>
          {pickup.window} · {pickup.job}
        </Text>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {pickup.customer}
        </Text>
        <Text style={styles.rowAddress} numberOfLines={1}>
          {pickup.address}
        </Text>
      </View>
      <StatusChip status={pickup.status} size="sm" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  subtitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.successBg,
  },
  syncText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.success },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  progressText: { flexDirection: 'row', justifyContent: 'space-between' },
  progressStrong: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  progressMuted: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
  content: { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  upNext: { backgroundColor: colors.ink, borderRadius: 20, padding: 18, gap: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upNextLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.hiVis,
  },
  upNextWindow: { fontFamily: fonts.condSemibold, fontSize: 22, color: colors.inkMuted },
  upNextCustomer: { fontFamily: fonts.condBold, fontSize: 30, lineHeight: 33, color: colors.surface },
  upNextAddress: { fontFamily: fonts.regular, fontSize: 17, color: colors.inkMuted },
  upNextNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.inkRaised,
  },
  upNextNoteText: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.surface },
  twoCol: { flexDirection: 'row', gap: 10 },
  allDone: { padding: 20, alignItems: 'center', gap: 6 },
  allDoneTitle: { fontFamily: fonts.condBold, fontSize: 26, color: colors.ink },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 14,
    minHeight: 76,
  },
  stopBadge: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBadgeText: { fontFamily: fonts.bold, fontSize: 16, color: colors.surface },
  rowMeta: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  rowAddress: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  completedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.successBg,
  },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  completedText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.success },
});
