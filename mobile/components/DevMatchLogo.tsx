import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Path, Defs, ClipPath, G, RadialGradient, LinearGradient, Stop } from "react-native-svg";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

let _uid = 0;

function DevMatchIcon({ size = 40 }: { size?: number }) {
  // Unique per-instance IDs so multiple logos on screen never share gradient refs
  const uid = useMemo(() => `dm${++_uid}`, []);
  const clipId      = `${uid}c`;
  const sphereId    = `${uid}s`;
  const shineId     = `${uid}h`;
  const innerGlowId = `${uid}i`;
  const rimId       = `${uid}r`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx="50" cy="50" r="49" />
        </ClipPath>

        {/* Sphere gradient — light from top-left, shadow bottom-right = 3D depth */}
        <RadialGradient id={sphereId} cx="32%" cy="26%" r="80%" fx="32%" fy="26%">
          <Stop offset="0%"   stopColor="#80BBFF" stopOpacity="1" />
          <Stop offset="28%"  stopColor="#3074FF" stopOpacity="1" />
          <Stop offset="62%"  stopColor="#1845C8" stopOpacity="1" />
          <Stop offset="100%" stopColor="#060E3A" stopOpacity="1" />
        </RadialGradient>

        {/* Specular gloss — bright spot top-left */}
        <RadialGradient id={shineId} cx="34%" cy="20%" r="46%">
          <Stop offset="0%"   stopColor="#ffffff" stopOpacity="0.55" />
          <Stop offset="50%"  stopColor="#ffffff" stopOpacity="0.10" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>

        {/* Soft inner center glow */}
        <RadialGradient id={innerGlowId} cx="50%" cy="50%" r="40%">
          <Stop offset="0%"   stopColor="#5590FF" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#5590FF" stopOpacity="0" />
        </RadialGradient>

        {/* Metallic rim — bright top-left, dark bottom-right */}
        <LinearGradient id={rimId} x1="10%" y1="0%" x2="90%" y2="100%">
          <Stop offset="0%"   stopColor="#C0DCFF" stopOpacity="1.0" />
          <Stop offset="25%"  stopColor="#6AACFF" stopOpacity="0.6" />
          <Stop offset="60%"  stopColor="#0E2A80" stopOpacity="0.5" />
          <Stop offset="100%" stopColor="#020A28" stopOpacity="1.0" />
        </LinearGradient>
      </Defs>

      {/* Solid fallback so the sphere is always blue even if gradients fail */}
      <Circle cx="50" cy="50" r="49" fill="#2563EB" />

      {/* Sphere gradient overlay */}
      <G clipPath={`url(#${clipId})`}>
        <Circle cx="50" cy="50" r="49" fill={`url(#${sphereId})`} />

        {/* Corner shadow panels — depth varies with light direction */}
        <Path d="M 3 3 L 50 32 L 32 50 Z"   fill="rgba(2,7,45,0.52)" />
        <Path d="M 97 3 L 50 32 L 68 50 Z"  fill="rgba(2,7,45,0.30)" />
        <Path d="M 3 97 L 32 50 L 50 68 Z"  fill="rgba(2,7,45,0.65)" />
        <Path d="M 97 97 L 68 50 L 50 68 Z" fill="rgba(2,7,45,0.45)" />

        {/* Cross structural lines */}
        <Path d="M 50 32 L 50 68" stroke="rgba(255,255,255,0.20)" strokeWidth="1.2" />
        <Path d="M 32 50 L 68 50" stroke="rgba(255,255,255,0.20)" strokeWidth="1.2" />

        {/* Inner diamond precision detail */}
        <Path
          d="M 50 37 L 63 50 L 50 63 L 37 50 Z"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="0.9"
        />

        {/* Soft center glow */}
        <Circle cx="50" cy="50" r="22" fill={`url(#${innerGlowId})`} />

        {/* Center focal dot */}
        <Circle cx="50" cy="50" r="3.5" fill="rgba(255,255,255,0.35)" />

        {/* Glossy specular overlay */}
        <Circle cx="50" cy="50" r="49" fill={`url(#${shineId})`} />
      </G>

      {/* Metallic rim bevel */}
      <Circle cx="50" cy="50" r="48.2" fill="none" stroke={`url(#${rimId})`} strokeWidth="2.5" />

      {/* Inner secondary bevel */}
      <Circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
    </Svg>
  );
}

function DevMatchWordmark({ fontSize = 20, letterSpacing = 3 }: { fontSize?: number; letterSpacing?: number }) {
  return (
    <View style={styles.wordmarkRow}>
      <Text style={[styles.wordDev,   { fontSize, letterSpacing }]}>DEV</Text>
      <Text style={[styles.wordMatch, { fontSize, letterSpacing }]}>MATCH</Text>
    </View>
  );
}

export function DevMatchLogo({ size = "md", showWordmark = true }: BrandLogoProps) {
  const configs = {
    sm: { iconSize: 28, fontSize: 14, letterSpacing: 2,   gap: 4  },
    md: { iconSize: 44, fontSize: 19, letterSpacing: 3,   gap: 7  },
    lg: { iconSize: 72, fontSize: 27, letterSpacing: 4.5, gap: 10 },
  };
  const { iconSize, fontSize, letterSpacing, gap } = configs[size];

  return (
    <View style={[styles.container, { gap }]}>
      <DevMatchIcon size={iconSize} />
      {showWordmark && (
        <DevMatchWordmark fontSize={fontSize} letterSpacing={letterSpacing} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  wordmarkRow: { flexDirection: "row" },
  wordDev:   { fontWeight: "800", color: "#00D4FF" },
  wordMatch: { fontWeight: "800", color: "#FF2D8A" },
});
