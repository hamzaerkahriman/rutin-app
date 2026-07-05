import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppStore } from '../../src/store/AppStore';
import { useAppTheme } from '../../src/theme/ThemeProvider';

function TabIcon({
  name,
  nameFocused,
  focused,
  badgeCount,
}: {
  name: keyof typeof Ionicons.glyphMap;
  nameFocused: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  badgeCount?: number;
}) {
  const { theme } = useAppTheme();
  return (
    <View>
      <Ionicons
        name={focused ? nameFocused : name}
        size={22}
        color={focused ? theme.accent : theme.textMuted}
      />
      {!!badgeCount && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -8,
            backgroundColor: theme.danger,
            borderRadius: 999,
            minWidth: 14,
            height: 14,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 2,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );
}

function NotificationsHeaderButton() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { unreadNotificationCount } = useAppStore();
  return (
    <Pressable
      testID="notifications-bell"
      onPress={() => router.push('/notifications')}
      hitSlop={12}
      style={{ paddingHorizontal: 8 }}
    >
      <View>
        <Ionicons name="notifications-outline" size={20} color={theme.text} />
        {unreadNotificationCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -6,
              backgroundColor: theme.danger,
              borderRadius: 999,
              minWidth: 16,
              height: 16,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 3,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function ProfileHeaderButton() {
  const router = useRouter();
  const { theme } = useAppTheme();
  return (
    <Pressable onPress={() => router.push('/profile')} hitSlop={12} style={{ paddingHorizontal: 8 }}>
      <Ionicons name="settings-outline" size={20} color={theme.text} />
    </Pressable>
  );
}

function HeaderRight() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <NotificationsHeaderButton />
      <ProfileHeaderButton />
    </View>
  );
}

export default function TabsLayout() {
  const { theme } = useAppTheme();
  const { unreadMessageCount } = useAppStore();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        headerRight: () => <HeaderRight />,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name="home-outline" nameFocused="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="checklist"
        options={{
          title: 'Checklist',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="checkbox-outline" nameFocused="checkbox" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Görevler',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="file-tray-full-outline" nameFocused="file-tray-full" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Ekip',
          tabBarIcon: ({ focused }) => <TabIcon name="people-outline" nameFocused="people" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesajlar',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="chatbubbles-outline"
              nameFocused="chatbubbles"
              focused={focused}
              badgeCount={unreadMessageCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Raporlar',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="bar-chart-outline" nameFocused="bar-chart" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
