import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, TouchableOpacity, Pressable, ScrollView,
  StyleSheet, StatusBar, ActivityIndicator,
} from "react-native";
import Animated, {
  FadeInDown, ZoomIn,
  useSharedValue, useAnimatedStyle, withSpring,
  withRepeat, withSequence, withTiming, withDelay, Easing,
} from "react-native-reanimated";
import * as DocumentPicker from "expo-document-picker";
import ResumeImproveModal from "@/components/ResumeImproveModal";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";
import type { ColorPalette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/theme";
import { API_URL } from "@/constants/api";

type Resume = {
  id: string;
  fileUrl: string;
  content: string;
  uploadedAt: string;
};

function AnimBlob({ style, delay = 0 }: { style: any; delay?: number }) {
  const sc = useSharedValue(1);
  useEffect(() => {
    sc.value = withDelay(delay, withRepeat(withSequence(
      withTiming(1.14, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
      withTiming(1.0,  { duration: 5000, easing: Easing.inOut(Easing.sin) }),
    ), -1, false));
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return <Animated.View style={[style, animStyle]} />;
}

function Btn3D({ onPress, loading, style, children }: {
  onPress: () => void; loading?: boolean; style: any; children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const rotX  = useSharedValue(0);
  const anim  = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { scale: scale.value }, { rotateX: `${rotX.value}deg` }],
  }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 14 }); rotX.value = withSpring(5, { damping: 12 }); }}
      onPressOut={() => { scale.value = withSpring(1,   { damping: 14 }); rotX.value = withSpring(0, { damping: 12 }); }}
      onPress={onPress}
      disabled={loading}
    >
      <Animated.View style={[style, anim]}>{children}</Animated.View>
    </Pressable>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ResumeScreen() {
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors: Colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showImprove, setShowImprove] = useState(false);

  async function fetchResume() {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/resume/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResume(data.resume);
      } else {
        setResume(null);
      }
    } catch {
      setResume(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchResume(); }, []);

  async function handleUpload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const file = result.assets[0];
      setUploading(true);
      setError(null);
      setSuccess(false);

      const formData = new FormData();
      formData.append("resume", {
        uri: file.uri,
        type: file.mimeType || "application/pdf",
        name: file.name || "resume.pdf",
      } as any);

      const token = await getToken();
      const res = await fetch(`${API_URL}/resume/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setResume(data.resume);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message ?? "Upload failed. Make sure the file is a valid PDF.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <AnimBlob style={[styles.blob, styles.blobTL]}  delay={0} />
      <AnimBlob style={[styles.blob, styles.blobBR]}  delay={900} />
      <AnimBlob style={[styles.blob, styles.blobMid]} delay={1600} />

      <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>{t("resume.title")}</Text>
        <Text style={styles.headerSub}>{t("resume.noResumeHint")}</Text>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.centered}>
            <ActivityIndicator color={Colors.blue} size="large" />
            <Text style={styles.loadingText}>Loading your resume…</Text>
          </Animated.View>
        ) : resume ? (
          <Animated.View entering={FadeInDown.delay(60).duration(400)} style={{ gap: Spacing.lg }}>

            <View style={styles.resumeCard}>
              <View style={styles.resumeCardTop}>
                <View style={styles.fileIconWrap}>
                  <Ionicons name="document-text" size={28} color={Colors.blue} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{resume.fileUrl}</Text>
                  <Text style={styles.fileDate}>Uploaded {timeAgo(resume.uploadedAt)}</Text>
                </View>
                <View style={styles.fileStatusBadge}>
                  <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
                  <Text style={styles.fileStatusText}>Active</Text>
                </View>
              </View>
            </View>

            <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.featuresCard}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardTitleAccent} />
                <Text style={styles.featuresTitle}>AI Features Enabled</Text>
              </View>
              {[
                { icon: "analytics-outline", label: "ATS Scanner", desc: "Match your resume against any job posting" },
                { icon: "create-outline",    label: "Cover Letters", desc: "Auto-generate tailored cover letters" },
              ].map((f, i) => (
                <Animated.View key={f.label} entering={FadeInDown.delay(200 + i * 80).duration(350)} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: Colors.blue + "18" }]}>
                    <Ionicons name={f.icon as any} size={16} color={Colors.blue} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureName}>{f.label}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                </Animated.View>
              ))}
            </Animated.View>

            {!!resume.content?.trim() && (
              <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.previewCard}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardTitleAccent} />
                  <Text style={styles.previewTitle}>Content Preview</Text>
                </View>
                <Text style={styles.previewText} numberOfLines={6}>{resume.content}</Text>
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(380).duration(400)}>
              <Btn3D onPress={handleUpload} loading={uploading} style={[styles.replaceBtn, uploading && { opacity: 0.7 }]}>
                {uploading
                  ? <ActivityIndicator color={Colors.blue} size="small" />
                  : <Ionicons name="cloud-upload-outline" size={16} color={Colors.blue} />}
                <Text style={styles.replaceBtnText}>{uploading ? t("resume.uploading") : t("resume.replaceResume")}</Text>
              </Btn3D>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(450).duration(400)}>
              <Btn3D
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowImprove(true); }}
                style={styles.improveBtn}
              >
                <Ionicons name="sparkles-outline" size={16} color={Colors.cyan} />
                <Text style={styles.improveBtnText}>{t("resume.improveWithAI")}</Text>
              </Btn3D>
            </Animated.View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ gap: Spacing.lg }}>

            <View style={styles.uploadZone}>
              <Animated.View entering={ZoomIn.delay(200).duration(500).springify()} style={styles.uploadIconWrap}>
                <Ionicons name="document-text-outline" size={48} color={Colors.blue} />
              </Animated.View>
              <Text style={styles.uploadZoneTitle}>{t("resume.noResume")}</Text>
              <Text style={styles.uploadZoneSub}>{t("resume.noResumeHint")}</Text>

              <Btn3D onPress={handleUpload} loading={uploading} style={[styles.uploadBtn, uploading && { opacity: 0.8 }]}>
                {uploading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="cloud-upload-outline" size={18} color="#fff" />}
                <Text style={styles.uploadBtnText}>{uploading ? t("resume.uploading") : t("resume.uploadResume")}</Text>
              </Btn3D>
            </View>

            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.featuresCard}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardTitleAccent} />
                <Text style={styles.featuresTitle}>What it unlocks</Text>
              </View>
              {[
                { icon: "analytics-outline",    label: "ATS Scanner",       desc: "See how well your resume matches any job" },
                { icon: "create-outline",        label: "Cover Letters",     desc: "Generate tailored letters in seconds" },
                { icon: "trending-up-outline",   label: "Better Matches",    desc: "AI uses your skills for smarter results" },
              ].map((f, i) => (
                <Animated.View key={f.label} entering={FadeInDown.delay(300 + i * 80).duration(350)} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: Colors.blue + "18" }]}>
                    <Ionicons name={f.icon as any} size={16} color={Colors.blue} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureName}>{f.label}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                </Animated.View>
              ))}
            </Animated.View>
          </Animated.View>
        )}

        {!!error && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}

        {success && (
          <Animated.View entering={ZoomIn.duration(400).springify()} style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.successText}>{t("resume.uploadSuccess")}</Text>
          </Animated.View>
        )}
      </ScrollView>

      <ResumeImproveModal
        visible={showImprove}
        onClose={() => setShowImprove(false)}
        onApplied={fetchResume}
      />
    </View>
  );
}

function makeStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    blob: { position: "absolute", borderRadius: 999 },
    blobTL:  { width: 260, height: 260, backgroundColor: Colors.cyan,  opacity: 0.08, top: -90, left: -80 },
    blobBR:  { width: 200, height: 200, backgroundColor: Colors.blue,  opacity: 0.07, bottom: 80, right: -70 },
    blobMid: { width: 150, height: 150, backgroundColor: Colors.pink,  opacity: 0.05, top: "40%", left: -40 },
    header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
    headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary },
    headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
    scroll: { flex: 1, paddingHorizontal: Spacing.xl },

    centered: { alignItems: "center", justifyContent: "center", gap: Spacing.md, paddingTop: 80 },
    loadingText: { fontSize: 13, color: Colors.textSecondary },

    uploadZone: {
      backgroundColor: Colors.bgCard, borderRadius: Radius.xl,
      borderWidth: 1, borderColor: Colors.border,
      padding: Spacing.xxl, alignItems: "center", gap: Spacing.md,
    },
    uploadIconWrap: {
      width: 88, height: 88, borderRadius: Radius.xl,
      backgroundColor: Colors.blue + "15",
      alignItems: "center", justifyContent: "center", marginBottom: Spacing.sm,
    },
    uploadZoneTitle: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
    uploadZoneSub: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },
    uploadBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, paddingVertical: 14, paddingHorizontal: 32,
      borderRadius: Radius.md, backgroundColor: Colors.blue, marginTop: Spacing.sm,
    },
    uploadBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    resumeCard: {
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
    },
    resumeCardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
    fileIconWrap: {
      width: 52, height: 52, borderRadius: Radius.md,
      backgroundColor: Colors.blue + "15",
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    fileInfo: { flex: 1 },
    fileName: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
    fileDate: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
    fileStatusBadge: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: Colors.success + "18", borderRadius: Radius.full,
      paddingHorizontal: 8, paddingVertical: 4,
      borderWidth: 1, borderColor: Colors.success + "44", flexShrink: 0,
    },
    fileStatusText: { fontSize: 11, fontWeight: "700", color: Colors.success },

    featuresCard: {
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md,
    },
    cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    cardTitleAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: Colors.blue },
    featuresTitle: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
    featureRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
    featureIcon: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    featureText: { flex: 1 },
    featureName: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
    featureDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

    previewCard: {
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md,
    },
    previewTitle: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
    previewText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 19 },

    replaceBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, paddingVertical: 13, borderRadius: Radius.md,
      borderWidth: 1, borderColor: Colors.blue, backgroundColor: Colors.blue + "12",
    },
    replaceBtnText: { color: Colors.blue, fontWeight: "700", fontSize: 14 },
    improveBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, paddingVertical: 13, borderRadius: Radius.md,
      borderWidth: 1, borderColor: Colors.cyan, backgroundColor: Colors.cyan + "12",
    },
    improveBtnText: { color: Colors.cyan, fontWeight: "700", fontSize: 14 },

    errorCard: {
      flexDirection: "row", alignItems: "center", gap: Spacing.sm,
      backgroundColor: Colors.danger + "18", borderRadius: Radius.md,
      borderWidth: 1, borderColor: Colors.danger + "44",
      padding: Spacing.lg, marginTop: Spacing.md,
    },
    errorText: { flex: 1, color: Colors.danger, fontSize: 13 },

    successCard: {
      flexDirection: "row", alignItems: "center", gap: Spacing.sm,
      backgroundColor: Colors.success + "18", borderRadius: Radius.md,
      borderWidth: 1, borderColor: Colors.success + "44",
      padding: Spacing.lg, marginTop: Spacing.md,
    },
    successText: { flex: 1, color: Colors.success, fontSize: 13, fontWeight: "600" },
  });
}
