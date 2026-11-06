import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthShell, authStyles as styles } from '@/components/AuthShell';
import { Icon } from '@/components/Icon';
import { AppButton } from '@/components/ui';
import { signUpErrorMessage, useAuth } from '@/data/auth';
import { colors } from '@/theme';

// Create account
export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const goToSignIn = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // On success the auth state changes and the root layout swaps to the signed-in screens,
  // so there's no manual navigation here.
  const submit = async () => {
    if (loading) return;
    if (name.trim().length === 0) return setError('Enter your name.');
    if (!email.includes('@')) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Use a password with at least 6 characters.');
    setError(null);
    setLoading(true);
    try {
      await signUp(name, email, password);
    } catch (e) {
      setError(signUpErrorMessage(e));
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your driver account">
      <View style={styles.field}>
        <Text style={styles.label} nativeID="nameLabel">
          Full name
        </Text>
        <TextInput
          accessibilityLabelledBy="nameLabel"
          value={name}
          onChangeText={setName}
          placeholder="Jordan Rivera"
          placeholderTextColor="#8A8F96"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          style={[styles.input, error && styles.inputError]}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label} nativeID="emailLabel">
          Work email
        </Text>
        <TextInput
          ref={emailRef}
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
          style={[styles.input, error && styles.inputError]}
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
            placeholder="At least 6 characters"
            placeholderTextColor="#8A8F96"
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={submit}
            style={[styles.input, { paddingRight: 60 }, error && styles.inputError]}
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

      {error && (
        <View accessibilityRole="alert" style={styles.error}>
          <Icon name="alert" size={20} color="#A82A14" strokeWidth={2.2} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <AppButton
        label={loading ? 'Creating account…' : 'Create account'}
        variant="hiVis"
        onPress={submit}
        loading={loading}
        style={{ marginTop: 4 }}
      />

      <Text style={styles.help}>
        Already have an account?{' '}
        <Text style={styles.helpLink} onPress={goToSignIn} accessibilityRole="link">
          Sign in
        </Text>
      </Text>
    </AuthShell>
  );
}
