import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Line } from "react-native-svg";
import { Colors } from "@/constants/theme";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

// The X/diamond icon from the design - geometric crosshatch pattern
function DevMatchIcon({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* Outer diamond */}
      <Path
        d="M20 2 L38 20 L20 38 L2 20 Z"
        fill="none"
        stroke="#2D6EF5"
        strokeWidth="2"
      />
      {/* Inner X lines */}
      <Path
        d="M11 11 L29 29 M29 11 L11 29"
        stroke="#2D6EF5"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Center horizontal + vertical */}
      <Path
        d="M20 8 L20 32 M8 20 L32 20"
        stroke="#2D6EF5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function DevMatchLogo({ size = "md", showWordmark = true }: BrandLogoProps) {
  const iconSize = size === "sm" ? 28 : size === "lg" ? 56 : 40;

  return (
    <View style={styles.container}>
      <DevMatchIcon size={iconSize} />
      {showWordmark && (
        <View style={styles.wordmarkRow}>
          {/* DEV in cyan, MATCH in pink */}
          <Text style={[styles.wordDev, size === "lg" && styles.wordLg]}>DEV</Text>
          <Text style={[styles.wordMatch, size === "lg" && styles.wordLg]}>MATCH</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 6,
  },
  wordmarkRow: {
    flexDirection: "row",
  },
  wordDev: {
    fontSize: 20,
    fontWeight: "800",
    color: "#00D4FF",
    letterSpacing: 2,
  },
  wordMatch: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FF2D8A",
    letterSpacing: 2,
  },
  wordLg: {
    fontSize: 28,
  },
});