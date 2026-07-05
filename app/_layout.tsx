import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppStoreProvider } from '../src/store/AppStore';
import { AuthProvider, useAuth } from '../src/providers/AuthProvider';
import { useAppTheme, ThemeProvider } from '../src/theme/ThemeProvider';

function useProtectedRoute() {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, initializing, segments]);
}

function RootStack() {
  const { theme, isDark } = useAppTheme();
  const { initializing } = useAuth();
  useProtectedRoute();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="task/create" options={{ title: 'Yeni Görev', presentation: 'modal' }} />
        <Stack.Screen name="task/[id]/index" options={{ title: 'Görev Detayı' }} />
        <Stack.Screen name="task/[id]/handoff" options={{ title: 'Görevi Devret', presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ title: 'Profil / Ayarlar' }} />
        <Stack.Screen name="notifications" options={{ title: 'Bildirimler' }} />
        <Stack.Screen name="messages/[id]" options={{ title: 'Sohbet' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppStoreProvider>
          <RootStack />
        </AppStoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
