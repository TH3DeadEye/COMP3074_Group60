import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { JobType, Pickup, PickupStatus } from '@/data/pickups';
import { colors, fonts } from '@/theme';
import { Icon, type IconName } from './Icon';

/* ---------- Status chip: always icon + word ---------- */

const statusLook: Record<PickupStatus, { label: string; bg: string; fg: string; icon: IconName; iconStroke: number }> = {
  scheduled: { label: 'Scheduled', bg: '#E6E8EC', fg: '#3A4250', icon: 'clock', iconStroke: 2.4 },
  in_progress: { label: 'In progress', bg: '#DCE7FB', fg: '#1847A8', icon: 'play', iconStroke: 0 },
  completed: { label: 'Completed', bg: colors.successBg, fg: colors.success, icon: 'check', iconStroke: 2.8 },
  missed: { label: 'Missed', bg: colors.dangerBg, fg: colors.danger, icon: 'x', iconStroke: 3 },
  cancelled: { label: 'Cancelled', bg: '#ECEBE7', fg: '#55595F', icon: 'cancelled', iconStroke: 2.4 },
};

export function statusColors(status: PickupStatus) {
  return statusLook[status];
}

export function StatusChip({ status, size = 'md' }: { status: PickupStatus; size?: 'sm' | 'md' | 'lg' }) {
  const look = statusLook[status];
  const dims = { sm: { h: 28, px: 10, font: 13, icon: 14 }, md: { h: 30, px: 12, font: 14, icon: 15 }, lg: { h: 34, px: 14, font: 15, icon: 16 } }[size];
  return (
    <View
      accessibilityLabel={`Status: ${look.label}`}
      style={[styles.chip, { height: dims.h, borderRadius: dims.h / 2, paddingHorizontal: dims.px, backgroundColor: look.bg }]}
    >
      <Icon name={look.icon} size={dims.icon} color={look.fg} strokeWidth={look.iconStroke} />
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: dims.font,
          color: look.fg,
          textDecorationLine: status === 'cancelled' ? 'line-through' : 'none',
        }}
      >
        {look.label}
      </Text>
    </View>
  );
}

/* ---------- Job tag ---------- */

export function JobTag({ job, onInk = false }: { job: JobType; onInk?: boolean }) {
  return (
    <View style={[styles.jobTag, { backgroundColor: onInk ? colors.inkRaised : colors.ink }]}>
      <Text style={styles.jobTagText}>{job}</Text>
    </View>
  );
}

/* ---------- Buttons: 56 tall ---------- */

type ButtonVariant = 'hiVis' | 'ink' | 'outline' | 'outlineOnInk' | 'text';

const buttonLook: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  hiVis: { bg: colors.hiVis, fg: colors.ink },
  ink: { bg: colors.ink, fg: colors.surface },
  outline: { bg: colors.surface, fg: colors.ink, border: colors.ink },
  outlineOnInk: { bg: 'transparent', fg: colors.surface, border: colors.inkBorder },
  text: { bg: 'transparent', fg: colors.muted },
};

export function AppButton({
  label,
  onPress,
  variant = 'ink',
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const look = buttonLook[variant];
  const isText = variant === 'text';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          height: isText ? 48 : 56,
          backgroundColor: look.bg,
          borderWidth: look.border ? 2 : 0,
          borderColor: look.border,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={20} color={look.fg} strokeWidth={2.2} />}
      <Text
        style={{
          color: look.fg,
          fontFamily: isText ? fonts.semibold : fonts.bold,
          fontSize: isText ? 16 : 18,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------- Card ---------- */

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ---------- Progress segments (one per stop) ---------- */

export function ProgressSegments({
  pickups,
  nextId,
  height = 8,
  gap = 4,
}: {
  pickups: Pickup[];
  nextId?: string;
  height?: number;
  gap?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap }} importantForAccessibility="no-hide-descendants">
      {pickups.map((p) => {
        let bg = colors.line;
        if (p.status === 'completed') bg = colors.doneMarker;
        else if (p.status === 'missed') bg = colors.danger;
        else if (p.id === nextId) bg = colors.hiVis;
        return <View key={p.id} style={{ flex: 1, height, borderRadius: height / 2, backgroundColor: bg }} />;
      })}
    </View>
  );
}

/* ---------- Map markers ---------- */

export function StopMarker({ pickup, isNext, onPress }: { pickup: Pickup; isNext: boolean; onPress?: () => void }) {
  const done = pickup.status === 'completed';
  const missed = pickup.status === 'missed' || pickup.status === 'cancelled';
  const size = isNext ? 48 : 36;
  const bg = isNext ? colors.hiVis : done ? colors.doneMarker : missed ? colors.danger : colors.ink;
  const fg = isNext ? colors.ink : colors.surface;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Stop ${pickup.stop}, ${pickup.customer}${done ? ', completed' : ''}${isNext ? ', next stop' : ''}`}
      onPress={onPress}
      hitSlop={6}
      style={[
        styles.marker,
        {
          width: size,
          height: size,
          backgroundColor: bg,
          borderColor: isNext ? colors.ink : colors.surface,
        },
      ]}
    >
      {done ? (
        <Icon name="check" size={16} color={fg} strokeWidth={3.2} />
      ) : missed ? (
        <Icon name="x" size={14} color={fg} strokeWidth={3.2} />
      ) : (
        <Text style={{ color: fg, fontFamily: fonts.bold, fontSize: isNext ? 19 : 15 }}>{pickup.stop}</Text>
      )}
    </Pressable>
  );
}

export function LocationDot({ halo = 12 }: { halo?: number }) {
  return (
    <View
      accessibilityLabel="Your location"
      style={{
        width: 20 + halo * 2,
        height: 20 + halo * 2,
        borderRadius: 999,
        backgroundColor: 'rgba(31, 111, 235, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={styles.locationDot} />
    </View>
  );
}

/* ---------- Bottom sheet handle ---------- */

export function SheetHandle() {
  return <View style={styles.handle} />;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 17,
  },
  jobTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  jobTagText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 1.3,
    color: colors.surface,
  },
  button: {
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    borderRadius: 16,
  },
  marker: {
    borderRadius: 999,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  locationDot: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: colors.location,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.inputBorder,
    alignSelf: 'center',
  },
});
