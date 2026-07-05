import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { AuthLayout, AuthSubmitButton, useAuthInputStyle } from '../../src/components/AuthLayout';
import { useAuth } from '../../src/providers/AuthProvider';
import { useAppTheme } from '../../src/theme/ThemeProvider';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const { theme } = useAppTheme();
  const inputStyle = useAuthInputStyle();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        setError(signInError);
        return;
      }
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bağlantı kurulamadı. İnternet bağlantını kontrol et.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Tekrar hoş geldin" subtitle="Devam etmek için hesabına giriş yap">
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-posta"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        style={inputStyle}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Şifre"
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        style={inputStyle}
      />

      <AuthSubmitButton
        label={loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        onPress={handleSubmit}
        disabled={!canSubmit}
      />

      <Link href="/(auth)/sign-up" style={[styles.link, { color: theme.textMuted }]}>
        Hesabın yok mu? <Text style={[styles.linkAccent, { color: theme.accent }]}>Kayıt ol</Text>
      </Link>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: {
    marginBottom: 4,
  },
  link: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
  },
  linkAccent: {
    fontWeight: '700',
  },
});
