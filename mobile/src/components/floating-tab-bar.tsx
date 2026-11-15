import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Typography } from '@/constants/typography';

const TAB_CONFIG: Record<
  string,
  { label: string; icon: any }
> = {
  index: {
    label: 'Home',
    icon: require('../assets/images/tabIcons/home.png'),
  },
  explore: {
    label: 'Live',
    icon: require('../assets/images/tabIcons/live.png'),
  },
  history: {
    label: 'History',
    icon: require('../assets/images/tabIcons/history.png'),
  },
  settings: {
    label: 'Settings',
    icon: require('../assets/images/tabIcons/settings.png'),
  },
};

export const FLOATING_BAR_HEIGHT = 60;

/**
 * Dynamically calculates the bottom scroll padding so the last content item
 * can scroll comfortably clear of the floating navbar on any device.
 */
export function useFloatingTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12);
  const extraPadding = 24;
  return FLOATING_BAR_HEIGHT + bottomOffset + extraPadding;
}

export function FloatingTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outerWrapper, { bottom: bottomOffset }]}
    >
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const config = TAB_CONFIG[route.name];
          if (!config) return null;

          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : config.label;

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          const onLongPress = () => {
            emitter.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [
                styles.tabItem,
                isFocused && styles.tabItemActive,
                pressed && styles.tabItemPressed,
              ]}
            >
              <Image
                source={config.icon}
                style={[
                  styles.icon,
                  { tintColor: isFocused ? '#E7F0E9' : '#7C8D84' },
                ]}
                resizeMode="contain"
              />
              <Text
                style={[
                  styles.label,
                  isFocused ? styles.labelActive : styles.labelInactive,
                ]}
                numberOfLines={1}
              >
                {typeof label === 'string' ? label : config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161B18', // Dark charcoal with subtle forest tint
    borderRadius: 36,
    paddingVertical: 6,
    paddingHorizontal: 8,
    width: '100%',
    maxWidth: 420,
    height: FLOATING_BAR_HEIGHT,
    borderWidth: 1,
    borderColor: '#26332C',
    // Diffuse drop shadow (iOS)
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    // Elevation (Android)
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 24,
  },
  tabItemActive: {
    backgroundColor: '#264235', // Muted sage-green rounded background
  },
  tabItemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  icon: {
    width: 20,
    height: 20,
    marginBottom: 3,
  },
  label: {
    ...Typography.body.medium,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  labelActive: {
    ...Typography.body.bold,
    color: '#E7F0E9', // Light sage
  },
  labelInactive: {
    ...Typography.body.medium,
    color: '#7C8D84', // Subtle muted grey-green
  },
});
