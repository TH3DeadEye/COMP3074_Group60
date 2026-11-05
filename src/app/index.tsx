import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthShell, authStyles as styles } from '@/components/AuthShell';
import { Icon } from '@/components/Icon';
import { AppButton } from '@/components/ui';
import { signInErrorMessage, useAuth } from '@/data/auth';
import { useOnline } from '@/data/useOnline';
import { colors } from '@/theme';

// Screen 1 · Login
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { signIn: signInWithFirebase } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const online = useOnline();
  const showError = error !== null;

  // On success the auth state changes and the root layout swaps to the signed-in screens,
  // so there's no manual navigation here.
  const signIn = async () => {
    if (loading) return;
    if (!email.includes('@') || password.length === 0) {
      setError(signInErrorMessage({ code: 'auth/invalid-credential' }));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithFirebase(email, password);
    } catch (e) {
      setError(signInErrorMessage(e));
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Sign in to see today's pickups">
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
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          style={[styles.input, showError && styles.inputError]}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label} nativeID="passwordLabel">
          Password
        </Text>
        <View>
          <TextInput
            ref={passwordRef}
            accessibilityLabelledBy="passwordLabel"
            returnKeyType="go"
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
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!online && (
        <View accessibilityRole="alert" style={styles.offline}>
          <Icon name="alert" size={20} color="#3A4250" strokeWidth={2.2} />
          <Text style={styles.offlineText}>You&apos;re offline. Connect to the internet to sign in.</Text>
        </View>
      )}

      <AppButton
        label={loading ? 'Signing in…' : 'Sign in'}
        variant="hiVis"
        onPress={signIn}
        loading={loading}
        style={{ marginTop: 4 }}
      />

      <Text style={styles.help}>
        Forgot your password?{' '}
        <Text style={styles.helpLink} onPress={() => setShowHelp((v) => !v)} accessibilityRole="link">
          Contact dispatch
        </Text>
      </Text>
      {showHelp && <Text style={styles.helpDetail}>Call dispatch on (416) 555-0142, 6am – 6pm.</Text>}

      <Text style={styles.help}>
        New driver?{' '}
        <Text style={styles.helpLink} onPress={() => router.push('/signup')} accessibilityRole="link">
          Create an account
        </Text>
      </Text>
    </AuthShell>
  );
}
