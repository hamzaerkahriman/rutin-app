import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { AuthLayout, AuthSubmitButton, authInputStyle, authPlaceholderColor } from '../../src/components/AuthLayout';
import { useAuth } from '../../src/providers/AuthProvider';
import { palette } from '../../src/theme/colors';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

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
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-posta"
        placeholderTextColor={authPlaceholderColor}
        autoCapitalize="none"
        keyboardType="email-address"
        style={authInputStyle}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Şifre"
        placeholderTextColor={authPlaceholderColor}
        secureTextEntry
        style={authInputStyle}
      />

      <AuthSubmitButton
        label={loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        onPress={handleSubmit}
        disabled={!canSubmit}
      />

      <Link href="/(auth)/sign-up" style={styles.link}>
        Hesabın yok mu? <Text style={styles.linkAccent}>Kayıt ol</Text>
      </Link>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: {
    color: '#FF8A80',
    marginBottom: 4,
  },
  link: {
    marginTop: 8,
    textAlign: 'center',
    color: 'rgba(242,241,237,0.75)',
    fontSize: 13,
  },
  linkAccent: {
    color: palette.goldLight,
    fontWeight: '700',
  },
});
