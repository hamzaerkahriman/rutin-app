import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBackground } from './AppBackground';
import { pickRandomBackground } from '../theme/backgrounds';
import { gradients, palette } from '../theme/colors';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const [background] = useState(() => pickRandomBackground());

  return (
    <AppBackground background={background}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <BlurView intensity={45} tint="dark" style={styles.card}>
            <Text style={styles.brand}>RUTİN</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <View style={{ marginTop: 20, gap: 12 }}>{children}</View>
          </BlurView>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

export function AuthSubmitButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} disabled={disabled}>
      {({ pressed }) => (
        <LinearGradient
          colors={gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[authStyles.button, { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
        >
          <Text style={authStyles.buttonText}>{label}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

const authStyles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: palette.sapphire,
    fontSize: 15,
    fontWeight: '700',
  },
});

export const authInputStyle = {
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.25)',
  backgroundColor: 'rgba(255,255,255,0.08)',
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 13,
  color: '#F2F1ED',
  fontSize: 15,
};

export const authPlaceholderColor = 'rgba(242,241,237,0.55)';

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 28,
    padding: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  brand: {
    color: '#F2F1ED',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 18,
  },
  title: {
    color: '#F2F1ED',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(242,241,237,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
});
