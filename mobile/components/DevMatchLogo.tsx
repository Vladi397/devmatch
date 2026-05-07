import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Path, Defs, ClipPath, G } from "react-native-svg";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

// ─── Icon ────────────────────────────────────────────────────────────────────
// Blue filled circle with 4 corner triangles creating an X/compass-star pattern
function DevMatchIcon({ size = 40, uid = "a" }: { size?: number; uid?: string }) {
  const clipId = `dm-clip-${uid}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx="50" cy="50" r="49" />
        </ClipPath>
      </Defs>

      <Circle cx="50" cy="50" r="49" fill="#2563EB" />

      <G clipPath={`url(#${clipId})`}>
        <Path d="M 3 3 L 50 32 L 32 50 Z"   fill="rgba(4,14,68,0.5)" />
        <Path d="M 97 3 L 50 32 L 68 50 Z"  fill="rgba(4,14,68,0.5)" />
        <Path d="M 3 97 L 32 50 L 50 68 Z"  fill="rgba(4,14,68,0.5)" />
        <Path d="M 97 97 L 68 50 L 50 68 Z" fill="rgba(4,14,68,0.5)" />
        <Path d="M 50 32 L 50 68" stroke="rgba(4,14,68,0.25)" strokeWidth="2" />
        <Path d="M 32 50 L 68 50" stroke="rgba(4,14,68,0.25)" strokeWidth="2" />
      </G>
    </Svg>
  );
}

// ─── Wordmark ─────────────────────────────────────────────────────────────────
// "DEV" in cyan + "MATCH" in pink/magenta — matches the actual logo palette
function DevMatchWordmark({ fontSize = 20, letterSpacing = 3 }: { fontSize?: number; letterSpacing?: number }) {
  return (
    <View style={styles.wordmarkRow}>
      <Text style={[styles.wordDev,   { fontSize, letterSpacing }]}>DEV</Text>
      <Text style={[styles.wordMatch, { fontSize, letterSpacing }]}>MATCH</Text>
    </View>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────
export function DevMatchLogo({ size = "md", showWordmark = true }: BrandLogoProps) {
  const configs = {
    sm: { iconSize: 28, fontSize: 14, letterSpacing: 2,   gap: 4  },
    md: { iconSize: 44, fontSize: 19, letterSpacing: 3,   gap: 7  },
    lg: { iconSize: 72, fontSize: 27, letterSpacing: 4.5, gap: 10 },
  };
  const { iconSize, fontSize, letterSpacing, gap } = configs[size];

  return (
    <View style={[styles.container, { gap }]}>
      <DevMatchIcon size={iconSize} uid={size} />
      {showWordmark && (
        <DevMatchWordmark fontSize={fontSize} letterSpacing={letterSpacing} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  wordmarkRow: {
    flexDirection: "row",
  },
  wordDev: {
    fontWeight: "800",
    color: "#00D4FF",
  },
  wordMatch: {
    fontWeight: "800",
    color: "#FF2D8A",
  },
});
