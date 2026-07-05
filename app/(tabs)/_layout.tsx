import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppStore } from '../../src/store/AppStore';
import { useAppTheme } from '../../src/theme/ThemeProvider';

function TabIcon({
  name,
  nameFocused,
  label,
  focused,
  badgeCount,
  testID,
}: {
  name: keyof typeof Ionicons.glyphMap;
  nameFocused: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
  badgeCount?: number;
  testID?: string;
}) {
  const { theme } = useAppTheme();
  return (
    <View
      testID={testID}
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
        focused && { backgroundColor: theme.accentLight },
      ]}
    >
      <View>
        <Ionicons
          name={focused ? nameFocused : name}
          size={20}
          color={focused ? theme.accent : theme.info}
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
      {focused && <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>{label}</Text>}
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
    <Pressable testID="profile-gear" onPress={() => router.push('/profile')} hitSlop={12} style={{ paddingHorizontal: 8 }}>
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
        tabBarShowLabel: false,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border, height: 64 },
        tabBarItemStyle: { paddingVertical: 6 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon testID="tab-dashboard" name="home-outline" nameFocused="home" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="checklist"
        options={{
          title: 'Checklist',
          tabBarIcon: ({ focused }) => (
            <TabIcon testID="tab-checklist" name="checkbox-outline" nameFocused="checkbox" label="Checklist" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Görevler',
          tabBarIcon: ({ focused }) => (
            <TabIcon testID="tab-tasks" name="file-tray-full-outline" nameFocused="file-tray-full" label="Görevler" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Ekip',
          tabBarIcon: ({ focused }) => (
            <TabIcon testID="tab-team" name="people-outline" nameFocused="people" label="Ekip" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesajlar',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              testID="tab-messages"
              name="chatbubbles-outline"
              nameFocused="chatbubbles"
              label="Mesajlar"
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
            <TabIcon testID="tab-reports" name="bar-chart-outline" nameFocused="bar-chart" label="Raporlar" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
