import React, { useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, {
  FadeInDown, FadeInUp, ZoomIn,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay,
  Easing,
} from "react-native-reanimated";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { DevMatchLogo } from "@/components/DevMatchLogo";

const STAGE = 220;

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

function OrbitRing({
  size, ca, cb, ms, cw = true,
}: { size: number; ca: string; cb: string; ms: number; cw?: boolean }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(
      withTiming(cw ? 360 : -360, { duration: ms, easing: Easing.linear }),
      -1,
      false
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));
  const offset = (STAGE - size) / 2;
  const dotSize = size < 100 ? 5 : 6;
  return (
    <Animated.View style={[{
      position: "absolute",
      width: size,
      height: size,
      borderRadius: size / 2,
      top: offset,
      left: offset,
      borderWidth: 1.5,
      borderTopColor: ca,
      borderRightColor: cb + "70",
      borderBottomColor: ca + "15",
      borderLeftColor: ca + "40",
    }, style]}>
      {/* Leading-edge satellite dot */}
      <View style={{
        position: "absolute",
        width: dotSize, height: dotSize, borderRadius: dotSize / 2,
        backgroundColor: ca,
        top: -dotSize / 2,
        left: size / 2 - dotSize / 2,
        shadowColor: ca, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6, elevation: 4,
      }} />
    </Animated.View>
  );
}

function GlowPulse({ color }: { color: string }) {
  const glowSize = 160;
  const offset = (STAGE - glowSize) / 2;
  const sc = useSharedValue(1);
  const op = useSharedValue(0.18);
  useEffect(() => {
    sc.value = withRepeat(withSequence(
      withTiming(1.32, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      withTiming(1.0,  { duration: 2200, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
    op.value = withRepeat(withSequence(
      withTiming(0.08, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.28, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: sc.value }],
    opacity: op.value,
  }));
  return (
    <Animated.View style={[{
      position: "absolute",
      width: glowSize, height: glowSize, borderRadius: glowSize / 2,
      backgroundColor: color,
      top: offset, left: offset,
    }, style]} />
  );
}

function BackgroundBlob({
  top, left, bottom, right, size, color, duration, delay = 0,
}: {
  top?: number; left?: number; bottom?: number; right?: number;
  size: number; color: string; duration: number; delay?: number;
}) {
  const sc = useSharedValue(1);
  useEffect(() => {
    sc.value = withDelay(delay, withRepeat(withSequence(
      withTiming(1.15, { duration, easing: Easing.inOut(Easing.sin) }),
      withTiming(1.0,  { duration, easing: Easing.inOut(Easing.sin) }),
    ), -1, false));
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <Animated.View style={[{
      position: "absolute",
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, opacity: 0.12,
      top, left, bottom, right,
    }, style]} />
  );
}

function PulseDot({ delay: d, color }: { delay: number; color: string }) {
  const op = useSharedValue(0.3);
  const sc = useSharedValue(0.7);
  useEffect(() => {
    op.value = withDelay(d, withRepeat(withSequence(
      withTiming(1,   { duration: 380 }),
      withTiming(0.3, { duration: 380 }),
    ), -1, false));
    sc.value = withDelay(d, withRepeat(withSequence(
      withTiming(1.15, { duration: 380 }),
      withTiming(0.7,  { duration: 380 }),
    ), -1, false));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ scale: sc.value }],
  }));
  return (
    <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, style]} />
  );
}

export default function Index() {
  const { colors: Colors } = useTheme();

  useEffect(() => {
    (async () => {
      try {
        const [token] = await Promise.all([
          getItem("auth_token"),
          new Promise<void>(res => setTimeout(res, 1800)),
        ]);
        if (!token) { router.replace("/welcome" as any); return; }
        const lang = await getItem("app_language");
        router.replace(lang ? "/(tabs)/dashboard" : ("/language" as any));
      } catch {
        router.replace("/welcome" as any);
      }
    })();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: Colors.bg }]}>
      <BackgroundBlob top={-100} left={-100} size={300} color={Colors.blue}  duration={4000} delay={0}   />
      <BackgroundBlob bottom={-70} right={-70} size={260} color={Colors.cyan} duration={3500} delay={700}  />

      <View style={styles.center}>
        {/* Icon stage: perspective 3D orbit system */}
        <View style={styles.stage}>
          <GlowPulse color={Colors.blue} />
          <OrbitRing size={76}  ca={Colors.pink} cb={Colors.blue} ms={1800} cw={true}  />
          <OrbitRing size={116} ca={Colors.blue} cb={Colors.cyan} ms={3200} cw={false} />
          <OrbitRing size={162} ca={Colors.cyan} cb={Colors.pink} ms={5400} cw={true}  />
          <Animated.View entering={ZoomIn.delay(250).duration(700).springify()}>
            <DevMatchLogo size="lg" showWordmark={false} />
          </Animated.View>
        </View>

        {/* Wordmark */}
        <Animated.View entering={FadeInDown.delay(750).duration(450)} style={styles.wordmarkRow}>
          <Text style={[styles.wordDev,   { color: Colors.cyan }]}>DEV</Text>
          <Text style={[styles.wordMatch, { color: Colors.pink }]}>MATCH</Text>
        </Animated.View>

        {/* Loading dots */}
        <Animated.View entering={FadeInUp.delay(1100).duration(400)} style={styles.dotsRow}>
          <PulseDot delay={0}   color={Colors.blue} />
          <PulseDot delay={160} color={Colors.cyan} />
          <PulseDot delay={320} color={Colors.blue} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  stage: {
    width: STAGE, height: STAGE,
    alignItems: "center", justifyContent: "center",
    transform: [{ perspective: 480 }, { rotateX: "22deg" }],
  },
  wordmarkRow: { flexDirection: "row", alignItems: "center" },
  wordDev:   { fontSize: 28, fontWeight: "800", letterSpacing: 4 },
  wordMatch: { fontSize: 28, fontWeight: "800", letterSpacing: 4 },
  dotsRow: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 4 },
});
