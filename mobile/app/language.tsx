import React, { useState, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar,
} from "react-native";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DevMatchLogo } from "@/components/DevMatchLogo";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";
import { LANGUAGES, type LanguageCode } from "@/constants/i18n";
import type { ColorPalette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/theme";
import { getPreferences } from "@/hooks/usePreferences";

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const { colors: Colors, isDark } = useTheme();
  const { setLanguage, t, language } = useLanguage();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [selected, setSelected] = useState<LanguageCode>(language);

  async function handleConfirm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setLanguage(selected);
    const prefs = await getPreferences();
    router.replace(prefs.onboardingDone ? "/(tabs)/dashboard" : ("/onboarding" as any));
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBot]} />

      <View style={[styles.inner, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}>

        <Animated.View entering={ZoomIn.duration(500).springify()} style={styles.logoWrap}>
          <DevMatchLogo size="md" />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.titleWrap}>
          <Text style={styles.title}>{t("language.title")}</Text>
          <Text style={styles.subtitle}>{t("language.subtitle")}</Text>
        </Animated.View>

        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {LANGUAGES.map((lang, i) => {
            const isActive = selected === lang.code;
            return (
              <Animated.View
                key={lang.code}
                entering={FadeInDown.delay(220 + i * 45).duration(350).springify()}
              >
                <TouchableOpacity
                  style={[styles.langRow, isActive && styles.langRowActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelected(lang.code as LanguageCode);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <View style={styles.langText}>
                    <Text style={[styles.langNative, isActive && styles.langNativeActive]}>
                      {lang.native}
                    </Text>
                    <Text style={styles.langLabel}>{lang.label}</Text>
                  </View>
                  <View style={[styles.radio, isActive && styles.radioActive]}>
                    {isActive && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>

        <Animated.View entering={FadeInUp.delay(500).duration(400)} style={styles.footer}>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={styles.confirmText}>{t("language.confirm")}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

function makeStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    blob: { position: "absolute", borderRadius: 999, opacity: 0.12 },
    blobTop: { width: 300, height: 300, backgroundColor: Colors.blue, top: -100, left: -80 },
    blobBot: { width: 250, height: 250, backgroundColor: Colors.cyan, bottom: -60, right: -60 },

    inner: { flex: 1, paddingHorizontal: Spacing.xl },
    logoWrap: { alignItems: "center", marginBottom: Spacing.lg },

    titleWrap: { alignItems: "center", marginBottom: Spacing.xl, gap: 6 },
    title: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary, textAlign: "center" },
    subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },

    listScroll: { flex: 1 },
    listContent: { gap: Spacing.sm, paddingBottom: Spacing.md },

    langRow: {
      flexDirection: "row", alignItems: "center", gap: Spacing.md,
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1.5, borderColor: Colors.border,
      paddingHorizontal: Spacing.lg, paddingVertical: 14,
    },
    langRowActive: {
      borderColor: Colors.blue,
      backgroundColor: Colors.blue + "0D",
    },
    flag: { fontSize: 26 },
    langText: { flex: 1 },
    langNative: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
    langNativeActive: { color: Colors.blue },
    langLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

    radio: {
      width: 24, height: 24, borderRadius: 12,
      borderWidth: 2, borderColor: Colors.border,
      alignItems: "center", justifyContent: "center",
    },
    radioActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },

    footer: { paddingTop: Spacing.md },
    confirmBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, backgroundColor: Colors.blue,
      borderRadius: Radius.full, paddingVertical: 16,
    },
    confirmText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  });
}
