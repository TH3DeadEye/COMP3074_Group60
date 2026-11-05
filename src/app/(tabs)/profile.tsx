import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { useTabBarInset } from '@/components/TabBar';
import { AppButton, Card, ProgressSegments } from '@/components/ui';
import { identityOf, useAuth } from '@/data/auth';
import { usePickups } from '@/data/pickups';
import { colors, fonts, tabular, type } from '@/theme';

// Screen 6 · Profile
export default function ProfileScreen() {
  const { pickups, lastSynced, driver, error, online, pendingCount } = usePickups();
  const { user, signOut } = useAuth();
  const tabInset = useTabBarInset();
  const { name, initials } = identityOf(user);
  const done = pickups.filter((p) => p.status === 'completed').length;
  const syncedAt = lastSynced
    ? `${String(lastSynced.getHours()).padStart(2, '0')}:${String(lastSynced.getMinutes()).padStart(2, '0')}`
    : null;

  // The card under the details: the honest answer to "is my work safe?".
  const card: { icon: IconName; bg: string; fg: string; title: string; body: string } = error
    ? { icon: 'alert', bg: colors.dangerBg, fg: colors.danger, title: "Can't sync", body: error }
    : pendingCount > 0
      ? {
          icon: 'clock',
          bg: colors.note,
          fg: colors.noteInk,
          title: `${pendingCount} ${pendingCount === 1 ? 'update' : 'updates'} waiting to sync`,
          body: online
            ? 'Sending now…'
            : "You're offline. They're saved on this phone and will be sent when you reconnect.",
        }
      : !online
        ? {
            icon: 'alert',
            bg: '#E6E8EC',
            fg: '#3A4250',
            title: "You're offline",
            body: 'Changes you make are saved on this phone and sent when you reconnect.',
          }
        : syncedAt
          ? {
              icon: 'cloudCheck',
              bg: colors.successBg,
              fg: '#17663A',
              title: 'All changes synced',
              body: `Status updates reach dispatch right away · last at ${syncedAt}`,
            }
          : {
              icon: 'cloudCheck',
              bg: colors.successBg,
              fg: '#17663A',
              title: 'Connecting…',
              body: 'Waiting to hear from the server',
            };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Text style={type.screenTitle} accessibilityRole="header">
          Profile
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabInset }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <View style={styles.avatar} importantForAccessibility="no">
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ gap: 4 }}>
            <Text style={styles.name}>{name}</Text>
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

        <View style={[styles.synced, { backgroundColor: card.bg }]}>
          <Icon name={card.icon} size={22} color={card.fg} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.syncedTitle, { color: card.fg }]}>{card.title}</Text>
            <Text style={[styles.syncedBody, { color: card.fg }]}>{card.body}</Text>
          </View>
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />

        <AppButton label="Sign out" icon="logout" variant="outline" onPress={() => void signOut()} />
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
