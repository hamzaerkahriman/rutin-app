import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { AuthLayout, AuthSubmitButton, useAuthInputStyle } from '../../src/components/AuthLayout';
import { useAuth } from '../../src/providers/AuthProvider';
import { useAppTheme } from '../../src/theme/ThemeProvider';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const { theme } = useAppTheme();
  const inputStyle = useAuthInputStyle();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length >= 6 && !loading;

  const handleSubmit = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { error: signUpError, needsConfirmation } = await signUp(email.trim(), password, name.trim());
      if (signUpError) {
        setError(signUpError);
        return;
      }
      if (needsConfirmation) {
        setInfo('Kayıt başarılı — devam etmek için e-postana gelen onay linkine tıkla, sonra giriş yap.');
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
    <AuthLayout title="Hesap oluştur" subtitle="Rutinini kurmaya bugün başla">
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      {info ? <Text style={[styles.info, { color: theme.success }]}>{info}</Text> : null}

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ad Soyad"
        placeholderTextColor={theme.textMuted}
        style={inputStyle}
      />
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
        placeholder="Şifre (en az 6 karakter)"
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        style={inputStyle}
      />

      <AuthSubmitButton
        label={loading ? 'Kayıt olunuyor...' : 'Kayıt Ol'}
        onPress={handleSubmit}
        disabled={!canSubmit}
      />

      <Link href="/(auth)/sign-in" style={[styles.link, { color: theme.textMuted }]}>
        Zaten hesabın var mı? <Text style={[styles.linkAccent, { color: theme.accent }]}>Giriş yap</Text>
      </Link>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: {
    marginBottom: 4,
  },
  info: {
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
