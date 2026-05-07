import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, Modal, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";
import type { ColorPalette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/theme";
import { API_URL } from "@/constants/api";

type Phase = "loading" | "results" | "applying" | "done";

type ResumeData = {
  name?: string;
  summary?: string;
  experience?: { title?: string; company?: string; bullets?: string[] }[];
  skills?: string[];
  improvements?: string[];
};

export default function ResumeImproveModal({
  visible,
  onClose,
  onApplied,
}: {
  visible: boolean;
  onClose: () => void;
  onApplied: () => void;
}) {
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors: Colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [phase, setPhase] = useState<Phase>("loading");
  const [improvements, setImprovements] = useState<string[]>([]);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPhase("loading");
      setError(null);
      fetchImprovements();
    }
  }, [visible]);

  async function fetchImprovements() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/ats/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to analyze resume");
      setImprovements(data.improvements ?? []);
      setResumeData(data.resumeData);
      setPhase("results");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
      setPhase("results");
    }
  }

  async function handleApply() {
    if (!resumeData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("applying");
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/ats/save-improved`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resumeData }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Save failed");
      }
      setPhase("done");
    } catch (err: any) {
      setError(err.message ?? "Save failed");
      setPhase("results");
    }
  }

  const sampleBullets: string[] = [];
  if (resumeData?.experience) {
    for (const exp of resumeData.experience) {
      for (const b of exp.bullets ?? []) {
        if (sampleBullets.length < 3) sampleBullets.push(b);
      }
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t("resumeImprove.title")}</Text>
            <Text style={styles.headerSub}>{t("resumeImprove.subtitle")}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {phase === "loading" && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.centered}>
              <ActivityIndicator color={Colors.blue} size="large" />
              <Text style={styles.centeredTitle}>{t("resumeImprove.analyzing")}</Text>
              <Text style={styles.centeredSub}>{t("resumeImprove.analyzingSub")}</Text>
            </Animated.View>
          )}

          {phase === "results" && (
            <Animated.View entering={FadeInDown.duration(350)} style={{ gap: Spacing.lg }}>
              {!!error && (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.errorCard}>
                  <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              )}

              {improvements.length > 0 && (
                <View style={styles.countHeader}>
                  <Text style={styles.countTitle}>
                    {t("resumeImprove.foundImprovements", { n: improvements.length })}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{improvements.length}</Text>
                  </View>
                </View>
              )}

              {improvements.length > 0 && (
                <View style={styles.card}>
                  <View style={styles.cardTitleRow}>
                    <View style={styles.cardAccent} />
                    <Ionicons name="checkmark-circle-outline" size={14} color={Colors.cyan} />
                    <Text style={styles.cardTitle}>{t("resumeImprove.willImprove")}</Text>
                  </View>
                  {improvements.map((imp, i) => (
                    <Animated.View key={i} entering={FadeInDown.delay(i * 60).duration(300)} style={styles.improvementRow}>
                      <Ionicons name="sparkles-outline" size={13} color={Colors.cyan} />
                      <Text style={styles.improvementText}>{imp}</Text>
                    </Animated.View>
                  ))}
                </View>
              )}

              {sampleBullets.length > 0 && (
                <Animated.View entering={FadeInDown.delay(120).duration(350)} style={styles.card}>
                  <View style={styles.cardTitleRow}>
                    <View style={styles.cardAccent} />
                    <Ionicons name="trending-up-outline" size={14} color={Colors.success} />
                    <Text style={styles.cardTitle}>{t("resumeImprove.sampleBullets")}</Text>
                  </View>
                  {sampleBullets.map((b, i) => (
                    <Animated.View key={i} entering={FadeInDown.delay(160 + i * 70).duration(300)} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{b}</Text>
                    </Animated.View>
                  ))}
                </Animated.View>
              )}

              {!error && improvements.length > 0 && (
                <Animated.View entering={FadeInDown.delay(300).duration(350)} style={{ gap: Spacing.md }}>
                  <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={styles.applyBtnText}>{t("resumeImprove.applyBtn")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dismissBtn} onPress={onClose} activeOpacity={0.7}>
                    <Text style={styles.dismissBtnText}>{t("resumeImprove.dismiss")}</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {error && (
                <TouchableOpacity style={styles.dismissBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.dismissBtnText}>{t("resumeImprove.doneClose")}</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}

          {phase === "applying" && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.centered}>
              <ActivityIndicator color={Colors.blue} size="large" />
              <Text style={styles.centeredTitle}>{t("resumeImprove.saving")}</Text>
            </Animated.View>
          )}

          {phase === "done" && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.doneWrap}>
              <Animated.View entering={ZoomIn.duration(500).springify()} style={styles.doneIconWrap}>
                <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
              </Animated.View>
              <Text style={styles.doneTitle}>{t("resumeImprove.doneTitle")}</Text>
              <Text style={styles.doneSub}>{t("resumeImprove.doneSub")}</Text>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => { onApplied(); onClose(); }}
                activeOpacity={0.85}
              >
                <Text style={styles.doneBtnText}>{t("resumeImprove.doneClose")}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    header: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg,
      borderBottomWidth: 1, borderBottomColor: Colors.border,
      backgroundColor: Colors.bgCard, gap: Spacing.md,
    },
    headerTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
    headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    closeBtn: {
      width: 34, height: 34, borderRadius: Radius.sm,
      borderWidth: 1, borderColor: Colors.border,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },

    centered: { alignItems: "center", gap: Spacing.lg, paddingTop: 80 },
    centeredTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
    centeredSub: { fontSize: 12, color: Colors.textMuted },

    errorCard: {
      flexDirection: "row", alignItems: "center", gap: Spacing.sm,
      backgroundColor: Colors.danger + "18", borderRadius: Radius.md,
      borderWidth: 1, borderColor: Colors.danger + "44", padding: Spacing.lg,
    },
    errorText: { flex: 1, color: Colors.danger, fontSize: 13 },

    countHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
    countTitle: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
    countBadge: {
      backgroundColor: Colors.cyan + "22", borderRadius: Radius.full,
      borderWidth: 1, borderColor: Colors.cyan + "55",
      paddingHorizontal: 10, paddingVertical: 3,
    },
    countBadgeText: { fontSize: 13, fontWeight: "800", color: Colors.cyan },

    card: {
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md,
    },
    cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    cardAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: Colors.blue },
    cardTitle: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },

    improvementRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
    improvementText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

    bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
    bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success, marginTop: 7, flexShrink: 0 },
    bulletText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

    applyBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.blue,
    },
    applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    dismissBtn: { alignItems: "center", paddingVertical: 12 },
    dismissBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },

    doneWrap: { alignItems: "center", gap: Spacing.lg, paddingTop: 60 },
    doneIconWrap: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: Colors.success + "15",
      alignItems: "center", justifyContent: "center",
    },
    doneTitle: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary },
    doneSub: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
    doneBtn: {
      marginTop: Spacing.md, paddingVertical: 14, paddingHorizontal: 48,
      borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    },
    doneBtnText: { color: Colors.textSecondary, fontWeight: "700", fontSize: 15 },
  });
}
