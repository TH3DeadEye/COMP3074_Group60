import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthBackdrop } from '@/components/AuthBackdrop';
import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { colors, fonts } from '@/theme';

// The look shared by the login and sign-up screens: brand header on a dark, colorful backdrop,
// with the form in a glass card on top.
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <AuthBackdrop />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.hero, { paddingTop: insets.top + 40 }]}>
            <View style={styles.brandRow}>
              <View style={styles.logo}>
                <Icon name="truck" size={30} color={colors.ink} />
              </View>
              <View style={{ gap: 2 }}>
                <Text style={styles.brand}>DUMPLO</Text>
                <Text style={styles.brandSub}>Driver</Text>
              </View>
            </View>
            <Text style={styles.heroTitle} accessibilityRole="header">
              {title}
            </Text>
          </View>

          <Glass
            style={styles.card}
            scheme="dark"
            tint="rgba(21, 23, 26, 0.35)"
            fallbackColor="rgba(32, 35, 40, 0.94)"
            fallbackBorder={colors.inkBorder}
          >
            {children}
          </Glass>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  hero: { paddingHorizontal: 28, paddingBottom: 28, gap: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.hiVis,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontFamily: fonts.condBold, fontSize: 28, lineHeight: 30, letterSpacing: 1.1, color: colors.surface },
  brandSub: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.hiVis,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  heroTitle: { fontFamily: fonts.condBold, fontSize: 40, lineHeight: 42, color: colors.surface },
  card: { marginHorizontal: 16, borderRadius: 28, padding: 22, gap: 20 },
});

// Styles for the fields and messages inside the card. The inputs stay solid white on purpose:
// what you type must stay easy to read whatever is drifting behind the glass.
export const authStyles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.surface },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 17,
    fontFamily: fonts.regular,
    color: colors.ink,
  },
  inputError: { borderColor: colors.danger },
  eye: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.dangerBg,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 15, fontFamily: fonts.semibold },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#E6E8EC',
  },
  offlineText: { flex: 1, color: '#3A4250', fontSize: 15, fontFamily: fonts.semibold },
  help: { textAlign: 'center', fontSize: 15, color: colors.inkMuted, fontFamily: fonts.regular },
  helpLink: { fontFamily: fonts.semibold, color: colors.hiVis, textDecorationLine: 'underline' },
  helpDetail: { textAlign: 'center', fontSize: 15, color: colors.surface, fontFamily: fonts.semibold },
});
