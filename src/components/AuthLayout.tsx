import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { elevatedStyle } from './ui';
import { useAppTheme } from '../theme/ThemeProvider';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.brand, { color: theme.accent }]}>RUTİN</Text>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
            <View style={{ marginTop: 20, gap: 12 }}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  const { theme } = useAppTheme();
  return (
    <Pressable onPress={disabled ? undefined : onPress} disabled={disabled}>
      {({ pressed }) => (
        <View
          style={[
            authStyles.button,
            { backgroundColor: theme.accent, opacity: disabled ? 0.5 : 1 },
            !disabled && elevatedStyle(pressed),
          ]}
        >
          <Text style={[authStyles.buttonText, { color: theme.accentText }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const authStyles = StyleSheet.create({
  button: {
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export function useAuthInputStyle() {
  const { theme } = useAppTheme();
  return {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.background,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: theme.text,
    fontSize: 15,
  };
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 12,
    padding: 26,
    borderWidth: 1,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
});
