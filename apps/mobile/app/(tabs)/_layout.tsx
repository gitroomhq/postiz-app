import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { Redirect, Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/src/stores/auth.store';
import { AppText, motion, radius, ScalePressable, spacing } from '@/src/ui';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const status = useAuthStore((state) => state.status);

  if (status === 'bootstrapping') {
    return null;
  }

  if (status !== 'authenticated') {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <PostizTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'calendar',
                android: 'calendar_month',
                web: 'calendar_month',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="compose"
        options={{
          title: 'Compose',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'square.and.pencil',
                android: 'edit',
                web: 'edit',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'bell',
                android: 'notifications',
                web: 'notifications',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'gearshape',
                android: 'settings',
                web: 'settings',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}

function PostizTabBar({ descriptors, navigation, state }: any) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBarWrap,
        {
          backgroundColor: colors.background,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}>
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}>
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options ?? {};
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const color = focused ? colors.tint : colors.tabIconDefault;
          const icon = options.tabBarIcon?.({ color, focused, size: focused ? 22 : 21 }) as ReactNode;

          function onPress() {
            const event = navigation.emit({
              canPreventDefault: true,
              target: route.key,
              type: 'tabPress',
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          }

          return (
            <ScalePressable
              accessibilityLabel={options.tabBarAccessibilityLabel}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              key={route.key}
              onPress={onPress}
              pressScale={0.96}
              style={styles.tabItem}>
              {focused ? (
                <Animated.View
                  entering={FadeIn.duration(motion.duration.fast)}
                  exiting={FadeOut.duration(motion.duration.fast)}
                  style={[styles.activeFill, { backgroundColor: colors.tintSoft }]}
                />
              ) : null}
              {focused ? (
                <Animated.View
                  entering={FadeIn.duration(motion.duration.fast)}
                  exiting={FadeOut.duration(motion.duration.fast)}
                  style={[styles.activeRail, { backgroundColor: colors.tint }]}
                />
              ) : null}
              <View style={styles.tabIcon}>{icon}</View>
              <AppText
                numberOfLines={1}
                style={{ color }}
                variant={focused ? 'captionStrong' : 'footnote'}>
                {String(label)}
              </AppText>
            </ScalePressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  activeFill: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  activeRail: {
    borderBottomLeftRadius: radius.pill,
    borderBottomRightRadius: radius.pill,
    height: 3,
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    top: 0,
  },
  tabBar: {
    borderCurve: 'continuous',
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 64,
    padding: spacing.xs,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  tabBarWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  tabIcon: {
    height: 22,
    justifyContent: 'center',
  },
  tabItem: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.lg,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 54,
    overflow: 'hidden',
    paddingHorizontal: 2,
    paddingTop: 4,
  },
});
