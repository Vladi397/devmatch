import React, { useMemo, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions,
} from "react-native";
import Animated, {
  FadeInDown, FadeInUp, ZoomIn,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay, Easing,
} from "react-native-reanimated";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DevMatchLogo } from "@/components/DevMatchLogo";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";
import type { ColorPalette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/theme";

const { height } = Dimensions.get("window");

function AnimBlob({ style, delay = 0 }: { style: any; delay?: number }) {
  const sc = useSharedValue(1);
  useEffect(() => {
    sc.value = withDelay(delay, withRepeat(withSequence(
      withTiming(1.12, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
      withTiming(1.0,  { duration: 5000, easing: Easing.inOut(Easing.sin) }),
    ), -1, false));
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return <Animated.View style={[style, animStyle]} />;
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors: Colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const logoFloat = useSharedValue(0);
  useEffect(() => {
    logoFloat.value = withRepeat(withSequence(
      withTiming(-9, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      withTiming( 0, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
  }, []);
  const logoFloatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: logoFloat.value }] }));

  const FEATURES = [
    {
      icon: "mic-outline" as const,
      color: Colors.blue,
      title: t("welcome.feature1Title"),
      sub: t("welcome.feature1Sub"),
    },
    {
      icon: "document-text-outline" as const,
      color: Colors.cyan,
      title: t("welcome.feature2Title"),
      sub: t("welcome.feature2Sub"),
    },
    {
      icon: "sparkles-outline" as const,
      color: Colors.pink,
      title: t("welcome.feature3Title"),
      sub: t("welcome.feature3Sub"),
    },
  ];

  function handleGetStarted() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/register");
  }

  function handleSignIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/login");
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <AnimBlob style={[styles.blob, styles.blobTop]} delay={0} />
      <AnimBlob style={[styles.blob, styles.blobMid]} delay={1000} />
      <AnimBlob style={[styles.blob, styles.blobBot]} delay={500} />

      <View style={[styles.inner, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>

        <Animated.View entering={ZoomIn.duration(600).springify()} style={[styles.logoWrap, logoFloatStyle]}>
          <DevMatchLogo size="lg" />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.taglineWrap}>
          <Text style={styles.tagline}>{t("welcome.tagline1")}</Text>
          <Text style={styles.taglineAccent}>{t("welcome.tagline2")}</Text>
          <Text style={styles.taglineSub}>{t("welcome.subtitle")}</Text>
        </Animated.View>

        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <Animated.View
              key={f.title}
              entering={FadeInDown.delay(380 + i * 90).duration(380).springify()}
              style={[styles.featureRow, { borderLeftColor: f.color + "90", borderLeftWidth: 3 }]}
            >
              <View style={[styles.featureIcon, { backgroundColor: f.color + "20" }]}>
                <Ionicons name={f.icon} size={18} color={f.color} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        <Animated.View
          entering={FadeInUp.delay(680).duration(400).springify()}
          style={styles.ctas}
        >
          <TouchableOpacity style={styles.btnPrimary} onPress={handleGetStarted} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>{t("welcome.getStarted")}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={handleSignIn} activeOpacity={0.8}>
            <Text style={styles.btnSecondaryText}>
              {t("welcome.alreadyHaveAccount")}{" "}
              <Text style={styles.btnSecondaryAccent}>{t("welcome.signIn")}</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </View>
  );
}

function makeStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },

    blob: { position: "absolute", borderRadius: 999, opacity: 0.18 },
    blobTop: { width: 340, height: 340, backgroundColor: Colors.blue, top: -120, left: -100 },
    blobMid: { width: 200, height: 200, backgroundColor: Colors.cyan, top: height * 0.38, right: -80, opacity: 0.1 },
    blobBot: { width: 280, height: 280, backgroundColor: Colors.pink, bottom: -80, right: -60, opacity: 0.13 },

    inner: { flex: 1, paddingHorizontal: Spacing.xl, justifyContent: "space-between" },
    logoWrap: { alignItems: "center", marginTop: Spacing.lg },

    taglineWrap: { alignItems: "center", gap: 4 },
    tagline: { fontSize: 30, fontWeight: "800", color: Colors.textPrimary, textAlign: "center", letterSpacing: 0.3 },
    taglineAccent: { fontSize: 30, fontWeight: "800", color: Colors.cyan, textAlign: "center", letterSpacing: 0.3 },
    taglineSub: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 21, marginTop: 8, paddingHorizontal: Spacing.lg },

    featureList: { gap: Spacing.sm },
    featureRow: {
      flexDirection: "row", alignItems: "center", gap: Spacing.md,
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
    },
    featureIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    featureText: { flex: 1, gap: 2 },
    featureTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
    featureSub: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

    ctas: { gap: Spacing.md },
    btnPrimary: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, backgroundColor: Colors.blue, borderRadius: Radius.full, paddingVertical: 16,
      shadowColor: Colors.blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 6,
    },
    btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
    btnSecondary: { alignItems: "center", paddingVertical: 8 },
    btnSecondaryText: { fontSize: 14, color: Colors.textSecondary },
    btnSecondaryAccent: { color: Colors.cyan, fontWeight: "700" },
  });
}
