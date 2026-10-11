import { router } from 'expo-router';
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

import { Icon } from '@/components/Icon';
import { AppButton } from '@/components/ui';
import { colors, fonts } from '@/theme';

// Screen 1 · Login
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Mockup only: any email with an "@" and a non-empty password signs in.
  const signIn = () => {
    if (!email.includes('@') || password.length === 0) {
      setShowError(true);
      return;
    }
    setShowError(false);
    router.replace('/today');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.ground }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.hero, { paddingTop: insets.top + 48 }]}>
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
            Sign in to see today's pickups
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label} nativeID="emailLabel">
              Work email
            </Text>
            <TextInput
              accessibilityLabelledBy="emailLabel"
              value={email}
              onChangeText={setEmail}
              placeholder="driver@company.com"
              placeholderTextColor="#8A8F96"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              style={[styles.input, showError && styles.inputError]}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label} nativeID="passwordLabel">
              Password
            </Text>
            <View>
              <TextInput
                accessibilityLabelledBy="passwordLabel"
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#8A8F96"
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={signIn}
                style={[styles.input, { paddingRight: 60 }, showError && styles.inputError]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eye}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={22} color={colors.muted} />
              </Pressable>
            </View>
          </View>

          {showError && (
            <View accessibilityRole="alert" style={styles.error}>
              <Icon name="alert" size={20} color="#A82A14" strokeWidth={2.2} />
              <Text style={styles.errorText}>Wrong email or password, or this isn't a driver account.</Text>
            </View>
          )}

          <AppButton label="Sign in" onPress={signIn} style={{ marginTop: 4 }} />

          <Text style={styles.help}>
            Forgot your password?{' '}
            <Text style={styles.helpLink} onPress={() => setShowHelp((v) => !v)} accessibilityRole="link">
              Contact dispatch
            </Text>
          </Text>
          {showHelp && <Text style={styles.helpDetail}>Call dispatch on (416) 555-0142, 6am – 6pm.</Text>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.ink,
    paddingHorizontal: 28,
    paddingBottom: 40,
    gap: 32,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
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
  form: { paddingHorizontal: 28, paddingVertical: 32, gap: 20, flex: 1 },
  field: { gap: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
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
  inputError: { borderColor: '#A82A14' },
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
    backgroundColor: '#FBE1DC',
  },
  errorText: { flex: 1, color: '#A82A14', fontSize: 15, fontFamily: fonts.semibold },
  help: { textAlign: 'center', fontSize: 15, color: colors.muted, fontFamily: fonts.regular },
  helpLink: { fontFamily: fonts.semibold, color: colors.ink, textDecorationLine: 'underline' },
  helpDetail: { textAlign: 'center', fontSize: 15, color: colors.ink, fontFamily: fonts.semibold },
});
