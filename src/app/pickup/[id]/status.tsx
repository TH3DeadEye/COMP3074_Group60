import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { ErrorBanner } from '@/components/ScreenState';
import { AppButton, SheetHandle, statusColors } from '@/components/ui';
import { statusTitle } from '@/data/model';
import { usePickups } from '@/data/pickups';
import { MISSED_REASONS, nextStatuses, STATUS_NOTE_LIMIT, type DriverStatus } from '@/data/transitions';
import { colors, fonts } from '@/theme';

const options: Record<DriverStatus, { hint: string; icon: IconName; confirm: string }> = {
  in_progress: { hint: "I'm on site", icon: 'play', confirm: 'Confirm · Start job' },
  completed: { hint: 'Job done', icon: 'check', confirm: 'Confirm · Complete job' },
  missed: { hint: "Can't do this one", icon: 'x', confirm: 'Confirm · Mark missed' },
};

// Screen 5 · Update Status (bottom sheet over Pickup Details)
export default function UpdateStatusSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPickup, updateStatus } = usePickups();
  const insets = useSafeAreaInsets();
  const pickup = getPickup(id);

  const [choice, setChoice] = useState<DriverStatus | null>(null);
  const [reason, setReason] = useState<(typeof MISSED_REASONS)[number] | null>(null);
  const [note, setNote] = useState('');
  const [saveError, setSaveError] = useState(false);

  if (!pickup) return null;

  const close = () => router.back();
  const allowed = nextStatuses(pickup.status);
  const selected = choice && allowed.includes(choice) ? choice : null;
  const missedSelected = selected === 'missed';
  const canConfirm = selected !== null && (!missedSelected || reason !== null);

  const confirm = () => {
    if (!selected || !canConfirm) return;
    const detail = [missedSelected ? reason : null, note.trim()].filter(Boolean).join(' — ');
    if (updateStatus(pickup.id, selected, detail || undefined)) close();
    else setSaveError(true);
  };

  const currentLabel = statusColors(pickup.status).label;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable accessibilityLabel="Close sheet" onPress={close} style={[StyleSheet.absoluteFill, styles.scrim]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
            <SheetHandle />

            <View style={{ gap: 2 }}>
              <Text style={styles.title} accessibilityRole="header">
                Update status
              </Text>
              <Text style={styles.subtitle}>
                {pickup.customer} · now <Text style={{ color: colors.ink, fontFamily: fonts.bold }}>{currentLabel}</Text>
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {allowed.map((status) => (
                <OptionCard
                  key={status}
                  title={statusTitle[status]}
                  hint={options[status].hint}
                  icon={options[status].icon}
                  status={status}
                  selected={selected === status}
                  onPress={() => {
                    setChoice(status);
                    setSaveError(false);
                  }}
                />
              ))}
            </View>
            {allowed.length === 0 && <Text style={styles.subtitle}>This pickup is closed.</Text>}

            {missedSelected && (
              <View style={{ gap: 8 }}>
                <Text style={styles.fieldLabel}>
                  Why was it missed? <Text style={{ color: colors.danger }}>Required</Text>
                </Text>
                <View style={styles.reasonWrap}>
                  {MISSED_REASONS.map((label) => {
                    const sel = label === reason;
                    return (
                      <Pressable
                        key={label}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: sel }}
                        onPress={() => setReason(label)}
                        style={[
                          styles.reason,
                          {
                            borderColor: sel ? colors.ink : colors.inputBorder,
                            backgroundColor: sel ? colors.ink : colors.surface,
                          },
                        ]}
                      >
                        <Text style={[styles.reasonText, { color: sel ? colors.surface : colors.ink }]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {selected && (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text style={styles.fieldLabel} nativeID="noteLabel">
                    Note <Text style={{ fontFamily: fonts.regular, color: colors.muted }}>(optional)</Text>
                  </Text>
                  <Text style={styles.counter}>
                    {note.length} / {STATUS_NOTE_LIMIT}
                  </Text>
                </View>
                <TextInput
                  accessibilityLabelledBy="noteLabel"
                  value={note}
                  onChangeText={setNote}
                  maxLength={STATUS_NOTE_LIMIT}
                  multiline
                  placeholder="Gate B locked, called site…"
                  placeholderTextColor="#8A8F96"
                  style={styles.textarea}
                />
              </View>
            )}

            {saveError && <ErrorBanner message="The pickup changed or is still syncing. Check its status and try again." />}
            <View style={{ gap: 4 }}>
              {allowed.length > 0 && (
                <AppButton label={selected ? options[selected].confirm : 'Choose a status'} onPress={confirm} disabled={!canConfirm} />
              )}
              <AppButton label={allowed.length ? 'Cancel' : 'Close'} variant="text" onPress={close} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function OptionCard({
  title,
  hint,
  icon,
  status,
  selected,
  onPress,
}: {
  title: string;
  hint: string;
  icon: IconName;
  status: DriverStatus;
  selected: boolean;
  onPress: () => void;
}) {
  const look = statusColors(status);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${hint}`}
      onPress={onPress}
      style={[
        styles.option,
        selected
          ? { borderWidth: 2.5, borderColor: colors.ink, backgroundColor: colors.selectedBg }
          : { borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface },
      ]}
    >
      <View style={[styles.optionIcon, { backgroundColor: look.bg }]}>
        <Icon name={icon} size={18} color={look.fg} strokeWidth={icon === 'play' ? 0 : 2.8} />
      </View>
      <View>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionHint}>{hint}</Text>
      </View>
      {selected && (
        <View style={styles.optionCheck}>
          <Icon name="check" size={14} color={colors.surface} strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: colors.scrim },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  title: { fontFamily: fonts.condBold, fontSize: 28, lineHeight: 31, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  option: {
    flex: 1,
    minHeight: 104,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    alignItems: 'flex-start',
  },
  optionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  optionHint: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  optionCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  reasonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reason: { height: 48, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center' },
  reasonText: { fontFamily: fonts.semibold, fontSize: 16 },
  counter: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  textarea: {
    height: 76,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.ink,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
  },
});
