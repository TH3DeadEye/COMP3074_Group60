import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';
import { Icon, type IconName } from './Icon';
import { AppButton, Card } from './ui';

/* ---------- Loading: spinner + words, so it's never just a spinning wheel ---------- */

export function LoadingState({ label = 'Loading…', compact = false }: { label?: string; compact?: boolean }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[styles.loading, compact && styles.loadingCompact]}
    >
      <ActivityIndicator size={compact ? 'small' : 'large'} color={colors.ink} />
      <Text style={[styles.loadingText, compact && { fontSize: 15 }]}>{label}</Text>
    </View>
  );
}

/* ---------- Empty: nothing to show, and what to do about it ---------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: { label: string; icon?: IconName; onPress: () => void; loading?: boolean };
}) {
  return (
    <Card style={styles.empty}>
      <View style={styles.emptyIcon} importantForAccessibility="no">
        <Icon name={icon} size={28} color={colors.muted} strokeWidth={2.2} />
      </View>
      <Text style={styles.emptyTitle} accessibilityRole="header">
        {title}
      </Text>
      {body && <Text style={styles.emptyBody}>{body}</Text>}
      {action && (
        <AppButton
          label={action.label}
          icon={action.icon}
          variant="outline"
          loading={action.loading}
          onPress={action.onPress}
          style={{ alignSelf: 'stretch', marginTop: 8 }}
        />
      )}
    </Card>
  );
}

/* ---------- Error: a red banner, with a retry when there's something to retry ---------- */

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View accessibilityRole="alert" style={styles.error}>
      <Icon name="alert" size={20} color={colors.danger} strokeWidth={2.2} />
      <Text style={styles.errorText}>{message}</Text>
      {onRetry && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 40 },
  loadingCompact: { flexDirection: 'row', justifyContent: 'flex-start', gap: 10, paddingVertical: 0 },
  loadingText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.muted },
  empty: { padding: 24, alignItems: 'center', gap: 6 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: fonts.condBold, fontSize: 26, color: colors.ink, textAlign: 'center' },
  emptyBody: { fontFamily: fonts.regular, fontSize: 16, color: colors.muted, textAlign: 'center' },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 8,
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: colors.dangerBg,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 15, fontFamily: fonts.semibold },
  retry: {
    minWidth: 72,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontFamily: fonts.bold, fontSize: 16, color: colors.danger },
});
