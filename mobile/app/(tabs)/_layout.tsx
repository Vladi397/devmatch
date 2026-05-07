import { Tabs } from "expo-router";
import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import type { ColorPalette } from "@/constants/theme";

type TabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  focusedName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  label: string;
};

function TabIcon({ name, focusedName, focused, label }: TabIconProps) {
  const { colors: Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <View style={styles.tabItem}>
      <Ionicons
        name={focused ? focusedName : name}
        size={24}
        color={focused ? Colors.blue : Colors.textMuted}
      />
      <Text
        style={[styles.tabLabel, focused && styles.tabLabelActive]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors: Colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: Colors.bgCard,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home-outline" focusedName="home" focused={focused} label="Home" />
          ),
        }}
      />
      <Tabs.Screen name="resume" options={{ href: null }} />
      <Tabs.Screen
        name="jobs"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="briefcase-outline" focusedName="briefcase" focused={focused} label="Jobs" />
          ),
        }}
      />
      <Tabs.Screen name="ats" options={{ href: null }} />
      <Tabs.Screen
        name="applications"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="layers-outline" focusedName="layers" focused={focused} label="Tracker" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person-outline" focusedName="person" focused={focused} label="Profile" />
          ),
        }}
      />
    </Tabs>
  );
}

function makeStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    tabItem: {
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingTop: 6,
    },
    tabLabel: {
      fontSize: 10,
      fontWeight: "500",
      color: Colors.textMuted,
    },
    tabLabelActive: {
      color: Colors.blue,
      fontWeight: "700",
    },
  });
}
