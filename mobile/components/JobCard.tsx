import React, { useState } from "react";
import { View, Text, StyleSheet, Linking, Platform, Image, Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radius, Spacing } from "@/constants/theme";

const LOGO_DEV_TOKEN = "pk_AR5bsdAtQQ6NVIvvzPLQ8Q";

const KNOWN_TLDS = /\.(io|ai|co|app|dev|team|tech|xyz|net|org|gg|so|me)(\s|$)/i;
const NOISE = /\b(ltd|limited|inc|corp|group|gmbh|bv|nv|plc|se|ag|sa|recruitment|staffing|consulting|solutions|services|technologies|technology|digital|global|uk|europe|international)\b/gi;

function guessDomain(company: string): string {
  const first = company.split(/[-–,\(]/)[0].trim();
  if (KNOWN_TLDS.test(first)) return first.replace(/\s/g, "").toLowerCase();
  const clean = first.replace(NOISE, "").replace(/[^a-z0-9]/gi, "").toLowerCase().trim();
  return clean + ".com";
}

function logoUrl(company: string): string {
  return `https://img.logo.dev/${guessDomain(company)}?token=${LOGO_DEV_TOKEN}&retina=true`;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary?: string;
  url: string;
  postedAt: string;
  source: "adzuna" | "remotive";
  tags: string[];
  description?: string;
}

interface JobCardProps {
  job: Job;
  saved?: boolean;
  onSave?: () => void;
  onUnsave?: () => void;
}

const AVATAR_COLORS = ["#2D6EF5", "#00C97A", "#FF6B6B", "#F59E0B", "#8B5CF6", "#06B6D4", "#EC4899"];

function avatarColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "?";
}

function CompanyAvatar({ company }: { company: string }) {
  const [failed, setFailed] = useState(false);
  const color = avatarColor(company);

  if (!failed) {
    return (
      <Image
        source={{ uri: logoUrl(company) }}
        style={[styles.avatar, styles.avatarLogo]}
        onError={() => setFailed(true)}
        resizeMode="contain"
      />
    );
  }

  return (
    <View style={[styles.avatar, { backgroundColor: color + "22", borderColor: color + "55", borderWidth: 1 }]}>
      <Text style={[styles.avatarText, { color }]}>{initials(company)}</Text>
    </View>
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

function openJob(url: string) {
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener");
  } else {
    Linking.openURL(url);
  }
}

function AnimBtn({ style, onPress, children }: { style: any; onPress: () => void; children: React.ReactNode }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.93, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      onPress={onPress}
    >
      <Animated.View style={[style, anim]}>{children}</Animated.View>
    </Pressable>
  );
}

export function JobCard({ job, saved = false, onSave, onUnsave }: JobCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <CompanyAvatar company={job.company} />

        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={2}>{job.title}</Text>
          <Text style={styles.company}>{job.company}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
            <Text style={styles.metaText}>{job.location}</Text>
            {job.remote && (
              <View style={styles.remoteBadge}>
                <Text style={styles.remoteBadgeText}>REMOTE</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.timeAgo}>{timeAgo(job.postedAt)}</Text>
      </View>

      {(job.salary || job.tags.length > 0) && (
        <View style={styles.middle}>
          {job.salary && (
            <View style={styles.salaryRow}>
              <Ionicons name="cash-outline" size={12} color={Colors.success} />
              <Text style={styles.salary}>{job.salary}</Text>
            </View>
          )}
          {job.tags.length > 0 && (
            <View style={styles.chips}>
              {job.tags.map((t) => (
                <View key={t} style={styles.chip}>
                  <Text style={styles.chipText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <AnimBtn
          style={styles.btnView}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openJob(job.url);
          }}
        >
          <Ionicons name="open-outline" size={14} color="#fff" />
          <Text style={styles.btnViewText}>View Job</Text>
        </AnimBtn>

        <AnimBtn
          style={[styles.btnSave, saved && styles.btnSaved]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            saved ? onUnsave?.() : onSave?.();
          }}
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={14}
            color={saved ? Colors.blue : Colors.textSecondary}
          />
          <Text style={[styles.btnSaveText, saved && { color: Colors.blue }]}>
            {saved ? "Saved" : "Save"}
          </Text>
        </AnimBtn>

        <View style={styles.sourceBadge}>
          <Text style={styles.sourceText}>{job.source === "adzuna" ? "Adzuna" : "Remotive"}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarLogo: { backgroundColor: "#ffffff", padding: 4, borderColor: Colors.border },
  avatarText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  headerInfo: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary, marginBottom: 2, lineHeight: 19 },
  company: { fontSize: 12, color: Colors.textSecondary, marginBottom: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  metaText: { fontSize: 11, color: Colors.textMuted },
  remoteBadge: { backgroundColor: Colors.cyan + "22", borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 1 },
  remoteBadgeText: { fontSize: 9, fontWeight: "700", color: Colors.cyan, letterSpacing: 0.5 },
  timeAgo: { fontSize: 10, color: Colors.textMuted, flexShrink: 0 },

  middle: { gap: Spacing.sm, marginBottom: Spacing.md },
  salaryRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  salary: { fontSize: 12, color: Colors.success, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: Colors.bgChip,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 11, color: Colors.cyan, fontWeight: "500" },

  actions: { flexDirection: "row", gap: Spacing.sm, alignItems: "center" },
  btnView: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: 10,
  },
  btnViewText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  btnSave: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnSaved: { borderColor: Colors.blue, backgroundColor: Colors.blue + "12" },
  btnSaveText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.border,
  },
  sourceText: { fontSize: 9, fontWeight: "700", color: Colors.textMuted, letterSpacing: 0.3 },
});
