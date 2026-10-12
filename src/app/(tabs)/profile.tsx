import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { AppButton, Card, ProgressSegments } from '@/components/ui';
import { driver, usePickups } from '@/data/pickups';
import { colors, fonts, tabular, type } from '@/theme';

// Screen 6 · Profile
export default function ProfileScreen() {
  const { pickups, lastSynced } = usePickups();
  const done = pickups.filter((p) => p.status === 'completed').length;
  const syncedAt = `${String(lastSynced.getHours()).padStart(2, '0')}:${String(lastSynced.getMinutes()).padStart(2, '0')}`;

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Text style={type.screenTitle} accessibilityRole="header">
          Profile
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <View style={styles.avatar} importantForAccessibility="no">
            <Text style={styles.avatarText}>{driver.initials}</Text>
          </View>
          <View style={{ gap: 4 }}>
            <Text style={styles.name}>{driver.name}</Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleText}>Driver</Text>
            </View>
          </View>
        </View>

        <Card>
          <InfoRow icon="truck" label="Assigned truck" value={`${driver.truck} · ${driver.truckType}`} />
          <InfoRow icon="clock" label="Shift" value={`${driver.date} · ${driver.shift}`} />
          <InfoRow icon="list" label="Today" value={`${pickups.length} pickups · ${done} done`} last>
            <ProgressSegments pickups={pickups} height={6} gap={3} />
          </InfoRow>
        </Card>

        <View style={styles.synced}>
          <Icon name="cloudCheck" size={22} color="#17663A" />
          <View style={{ flex: 1 }}>
            <Text style={styles.syncedTitle}>All changes synced</Text>
            <Text style={styles.syncedBody}>Status updates reach dispatch right away · last at {syncedAt}</Text>
          </View>
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />

        <AppButton label="Sign out" icon="logout" variant="outline" onPress={() => router.replace('/')} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
  children,
}: {
  icon: IconName;
  label: string;
  value: string;
  last?: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <Icon name={icon} size={22} color={colors.muted} />
      <View style={{ flex: 1, gap: 6 }}>
        <View>
          <Text style={type.label}>{label}</Text>
          <Text style={[styles.infoValue, tabular]}>{value}</Text>
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  header: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 12 },
  content: { flexGrow: 1, paddingTop: 4, paddingHorizontal: 16, paddingBottom: 20, gap: 14 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 4, paddingHorizontal: 4, paddingBottom: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.condBold, fontSize: 28, color: colors.hiVis },
  name: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 27, color: colors.ink },
  roleTag: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.mapGround,
  },
  roleText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: '#3A3F46',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 64,
  },
  infoValue: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  synced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.successBg,
  },
  syncedTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.success },
  syncedBody: { fontFamily: fonts.regular, fontSize: 14, color: colors.success },
});
