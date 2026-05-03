import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, StatusBar, Platform, Alert,
  Modal, TextInput, Clipboard, ActivityIndicator,
} from "react-native";
import Animated, {
  FadeInDown, FadeInUp, ZoomIn,
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { DevMatchLogo } from "@/components/DevMatchLogo";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Radius, Spacing } from "@/constants/theme";

const API_URL = Platform.OS === "web"
  ? "http://localhost:3000"
  : "http://192.168.0.3:3000";

type AppStatus = "pending" | "applied" | "interview" | "rejected";

type Application = {
  id: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary?: string;
  url: string;
  source: string;
  tags: string[];
  description?: string;
  status: AppStatus;
  savedAt: string;
};

type Counts = { all: number; pending: number; applied: number; interview: number; rejected: number };

const FILTERS: { key: AppStatus | "all"; label: string; color: string; icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap }[] = [
  { key: "all", label: "All", color: Colors.textSecondary, icon: "apps-outline" },
  { key: "pending", label: "Saved", color: Colors.cyan, icon: "bookmark-outline" },
  { key: "applied", label: "Applied", color: Colors.blue, icon: "paper-plane-outline" },
  { key: "interview", label: "Interview", color: Colors.success, icon: "calendar-outline" },
  { key: "rejected", label: "Rejected", color: Colors.danger, icon: "close-circle-outline" },
];

const STATUS_OPTIONS: { key: AppStatus; label: string; color: string }[] = [
  { key: "pending", label: "Saved", color: Colors.cyan },
  { key: "applied", label: "Applied", color: Colors.blue },
  { key: "interview", label: "Interview", color: Colors.success },
  { key: "rejected", label: "Rejected", color: Colors.danger },
];

// ─── Count-up hook ───
function useCountUp(target: number, delay = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    const t = setTimeout(() => {
      const start = Date.now();
      const iv = setInterval(() => {
        const p = Math.min((Date.now() - start) / 700, 1);
        setCount(Math.round(target * p));
        if (p >= 1) clearInterval(iv);
      }, 16);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [target]);
  return count;
}

// ─── Stat box ───
function StatBox({ label, value, color, icon, index }: { label: string; value: number; color: string; icon: any; index: number }) {
  const count = useCountUp(value, 250 + index * 80);
  return (
    <Animated.View entering={ZoomIn.delay(150 + index * 70).duration(400).springify()} style={styles.statBox}>
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// ─── Filter chip ───
function FilterChip({ filter, active, count, onPress }: { filter: typeof FILTERS[0]; active: boolean; count: number; onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <TouchableOpacity
        style={[styles.filterChip, active && { borderColor: filter.color, backgroundColor: filter.color + "18" }]}
        onPress={() => { scale.value = withSequence(withSpring(0.88), withSpring(1)); onPress(); }}
        activeOpacity={0.8}
      >
        <Ionicons name={filter.icon} size={12} color={active ? filter.color : Colors.textMuted} />
        <Text style={[styles.filterChipText, active && { color: filter.color, fontWeight: "700" }]}>{filter.label}</Text>
        {count > 0 && (
          <View style={[styles.filterBadge, { backgroundColor: active ? filter.color : Colors.border }]}>
            <Text style={[styles.filterBadgeText, { color: active ? "#fff" : Colors.textMuted }]}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Application card ───
function AppCard({ app, index, onStatusChange, onDelete, onGenerateLetter }: {
  app: Application;
  index: number;
  onStatusChange: (id: string, status: AppStatus) => void;
  onDelete: (id: string) => void;
  onGenerateLetter: (app: Application) => void;
}) {
  const status = STATUS_OPTIONS.find((s) => s.key === app.status)!;

  function showStatusPicker() {
    if (Platform.OS === "web") return;
    Alert.alert("Update Status", "Move this application to:", [
      ...STATUS_OPTIONS.filter((s) => s.key !== app.status).map((s) => ({
        text: s.label,
        onPress: () => onStatusChange(app.id, s.key),
      })),
      { text: "Remove", style: "destructive", onPress: () => onDelete(app.id) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 70, 420)).duration(350).springify()}>
      <View style={styles.appCard}>
        <View style={styles.appCardTop}>
          <View style={styles.appInfo}>
            <Text style={styles.appTitle} numberOfLines={1}>{app.title}</Text>
            <Text style={styles.appCompany}>{app.company}</Text>
            <View style={styles.appMeta}>
              <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.appMetaText}>{app.location}</Text>
              {app.remote && (
                <View style={styles.remoteBadge}>
                  <Text style={styles.remoteBadgeText}>REMOTE</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: status.color + "22", borderColor: status.color + "55" }]}
            onPress={showStatusPicker}
            activeOpacity={0.7}
          >
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            {Platform.OS !== "web" && <Ionicons name="chevron-down" size={10} color={status.color} />}
          </TouchableOpacity>
        </View>

        {app.salary && (
          <View style={styles.salaryRow}>
            <Ionicons name="cash-outline" size={11} color={Colors.success} />
            <Text style={styles.salary}>{app.salary}</Text>
          </View>
        )}

        {/* Actions row */}
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.letterBtn} onPress={() => onGenerateLetter(app)} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={13} color={Colors.cyan} />
            <Text style={styles.letterBtnText}>Cover Letter</Text>
          </TouchableOpacity>

          {Platform.OS === "web" && (
            <>
              {STATUS_OPTIONS.filter((s) => s.key !== app.status).map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.webActionBtn, { borderColor: s.color + "55" }]}
                  onPress={() => onStatusChange(app.id, s.key)}
                >
                  <Text style={[styles.webActionText, { color: s.color }]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.webDeleteBtn} onPress={() => onDelete(app.id)}>
                <Ionicons name="trash-outline" size={13} color={Colors.danger} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default function ApplicationsScreen() {
  const { getToken } = useAuth();
  const [activeFilter, setActiveFilter] = useState<AppStatus | "all">("all");
  const [applications, setApplications] = useState<Application[]>([]);
  const [counts, setCounts] = useState<Counts>({ all: 0, pending: 0, applied: 0, interview: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  // Motivation letter modal
  const [letterApp, setLetterApp] = useState<Application | null>(null);
  const [jobDesc, setJobDesc] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [letter, setLetter] = useState<string | null>(null);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchApplications = useCallback(async (status?: AppStatus | "all") => {
    try {
      setLoading(true);
      const token = await getToken();
      const url = status && status !== "all"
        ? `${API_URL}/applications?status=${status}`
        : `${API_URL}/applications`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setApplications(data.applications);
      setCounts(data.counts);
    } catch {}
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { fetchApplications(activeFilter); }, [activeFilter]);

  async function handleStatusChange(id: string, status: AppStatus) {
    try {
      const token = await getToken();
      await fetch(`${API_URL}/applications/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
      setCounts((prev) => {
        const old = applications.find((a) => a.id === id)?.status as AppStatus;
        if (!old) return prev;
        return { ...prev, [old]: prev[old] - 1, [status]: prev[status] + 1 };
      });
    } catch {}
  }

  async function handleGenerateLetter(app: Application, manualDesc?: string) {
    if (!app) return;
    try {
      setGenerating(true); setLetterError(null); setLetter(null);
      const token = await getToken();
      const body: any = { title: app.title, company: app.company, applicationId: app.id };
      if (manualDesc?.trim()) body.jobDescription = manualDesc.trim();
      const res = await fetch(`${API_URL}/motivation/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "Failed to generate");
      setLetter(data.letter);
    } catch (err: any) { setLetterError(err.message ?? "Something went wrong"); }
    finally { setGenerating(false); }
  }

  function handleCopy() {
    if (!letter) return;
    Clipboard.setString(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openLetterModal(app: Application) {
    setLetterApp(app);
    setJobDesc(""); setLetter(null); setLetterError(null); setCopied(false);
    setShowManualInput(false); setDescExpanded(false);
  }

  async function handleDelete(id: string) {
    try {
      const token = await getToken();
      await fetch(`${API_URL}/applications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const removed = applications.find((a) => a.id === id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      if (removed) setCounts((prev) => ({ ...prev, all: prev.all - 1, [removed.status]: prev[removed.status as keyof Counts] - 1 }));
    } catch {}
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <DevMatchLogo size="sm" />
        <Text style={styles.headerTitle}>APPLICATIONS</Text>
      </Animated.View>

      {/* Stats */}
      <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.statsRow}>
        <StatBox label="Saved" value={counts.pending} color={Colors.cyan} icon="bookmark-outline" index={0} />
        <StatBox label="Applied" value={counts.applied} color={Colors.blue} icon="paper-plane-outline" index={1} />
        <StatBox label="Interview" value={counts.interview} color={Colors.success} icon="calendar-outline" index={2} />
        <StatBox label="Rejected" value={counts.rejected} color={Colors.danger} icon="close-circle-outline" index={3} />
      </Animated.View>

      {/* Filters */}
      <Animated.View entering={FadeInUp.delay(160).duration(400)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              filter={f}
              active={activeFilter === f.key}
              count={f.key === "all" ? counts.all : counts[f.key as keyof Counts]}
              onPress={() => setActiveFilter(f.key)}
            />
          ))}
        </ScrollView>
      </Animated.View>

      {/* List */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {!loading && applications.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptySubtitle}>Tap Save on any job in the Jobs tab to start tracking it here.</Text>
          </Animated.View>
        ) : (
          applications.map((app, i) => (
            <AppCard
              key={app.id}
              app={app}
              index={i}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onGenerateLetter={openLetterModal}
            />
          ))
        )}
      </ScrollView>

      {/* Cover Letter Modal */}
      <Modal visible={!!letterApp} animationType="slide" onRequestClose={() => setLetterApp(null)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Cover Letter</Text>
              {letterApp && <Text style={styles.modalSub}>{letterApp.title} · {letterApp.company}</Text>}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setLetterApp(null)}>
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg }} nestedScrollEnabled>

            {/* ── Generating spinner ── */}
            {generating && (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.generatingWrap}>
                <ActivityIndicator color={Colors.cyan} size="large" />
                <Text style={styles.generatingText}>Writing your cover letter…</Text>
                <Text style={styles.generatingSubText}>Powered by Gemini AI</Text>
              </Animated.View>
            )}

            {/* ── Error banner ── */}
            {!generating && letterError && (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} />
                <Text style={styles.errorText}>{letterError}</Text>
              </Animated.View>
            )}

            {/* ── Pre-generate: description preview + button ── */}
            {!generating && !letter && !showManualInput && (
              letterApp?.description ? (
                <Animated.View entering={FadeInDown.duration(350)} style={{ gap: Spacing.lg }}>
                  <View>
                    <Text style={styles.inputLabel}>Job Description</Text>
                    {descExpanded ? (
                      <View style={styles.descPreviewBox}>
                        <Text key="desc-expanded" style={styles.descPreviewText}>
                          {letterApp.description}
                        </Text>
                        <TouchableOpacity
                          style={styles.expandBtn}
                          onPress={() => setDescExpanded(false)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.expandBtnText}>See less</Text>
                          <Ionicons name="chevron-up" size={13} color={Colors.blue} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.descPreviewBox}>
                        <Text key="desc-collapsed" style={styles.descPreviewText} numberOfLines={6}>
                          {letterApp.description}
                        </Text>
                        {letterApp.description.length > 300 && (
                          <TouchableOpacity
                            style={styles.expandBtn}
                            onPress={() => setDescExpanded(true)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.expandBtnText}>See more</Text>
                            <Ionicons name="chevron-down" size={13} color={Colors.blue} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.generateBtn}
                    onPress={() => handleGenerateLetter(letterApp)}
                  >
                    <Ionicons name="sparkles" size={16} color="#fff" />
                    <Text style={styles.generateBtnText}>Generate Cover Letter</Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.noDescWrap}>
                  <Ionicons name="document-text-outline" size={36} color={Colors.textMuted} />
                  <Text style={styles.noDescTitle}>No description available</Text>
                  <Text style={styles.noDescText}>This job was saved before descriptions were fetched. Re-save it from the Jobs tab, or paste it manually below.</Text>
                  <TouchableOpacity style={styles.pasteBtn} onPress={() => setShowManualInput(true)}>
                    <Text style={styles.pasteBtnText}>Paste Manually</Text>
                  </TouchableOpacity>
                </Animated.View>
              )
            )}

            {/* ── Manual paste fallback ── */}
            {!generating && !letter && showManualInput && (
              <Animated.View entering={FadeInDown.duration(300)} style={{ gap: Spacing.md }}>
                <Text style={styles.inputLabel}>Paste the job description</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={8}
                  placeholder="Paste the full job description here..."
                  placeholderTextColor={Colors.textMuted}
                  value={jobDesc}
                  onChangeText={setJobDesc}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[styles.generateBtn, !jobDesc.trim() && { opacity: 0.5 }]}
                  onPress={() => letterApp && handleGenerateLetter(letterApp, jobDesc)}
                  disabled={!jobDesc.trim()}
                >
                  <Ionicons name="sparkles" size={16} color="#fff" />
                  <Text style={styles.generateBtnText}>Generate Cover Letter</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* ── Generated letter ── */}
            {!generating && !!letter && (
              <>
                <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.letterBanner}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  <Text style={styles.letterBannerText}>Your cover letter is ready. Review, copy, and paste it into your application.</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.letterBox}>
                  <Text style={styles.letterText}>{letter}</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ gap: Spacing.md }}>
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                    <Ionicons name={copied ? "checkmark-done-outline" : "copy-outline"} size={16} color="#fff" />
                    <Text style={styles.copyBtnText}>{copied ? "Copied!" : "Copy to Clipboard"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.regenerateBtn}
                    onPress={() => { setLetter(null); setLetterError(null); }}
                  >
                    <Text style={styles.regenerateBtnText}>Regenerate</Text>
                  </TouchableOpacity>
                </Animated.View>
              </>
            )}

          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.xl, paddingTop: 54, paddingBottom: Spacing.md,
  },
  headerTitle: { fontSize: 13, fontWeight: "800", color: Colors.textMuted, letterSpacing: 2 },

  statsRow: { flexDirection: "row", paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.md },
  statBox: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
    alignItems: "center", gap: 3,
  },
  statIcon: { width: 26, height: 26, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: "800", lineHeight: 22 },
  statLabel: { fontSize: 8, fontWeight: "700", color: Colors.textMuted, letterSpacing: 0.5, textTransform: "uppercase" },

  filterRow: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, paddingBottom: Spacing.md },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  filterChipText: { fontSize: 12, color: Colors.textMuted, fontWeight: "500" },
  filterBadge: { borderRadius: Radius.full, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: "center" },
  filterBadgeText: { fontSize: 9, fontWeight: "700" },

  scroll: { flex: 1, paddingHorizontal: Spacing.xl },

  appCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.sm,
  },
  appCardTop: { flexDirection: "row", gap: Spacing.md, alignItems: "flex-start" },
  appInfo: { flex: 1 },
  appTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary, marginBottom: 2 },
  appCompany: { fontSize: 12, color: Colors.textSecondary, marginBottom: 3 },
  appMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  appMetaText: { fontSize: 11, color: Colors.textMuted },
  remoteBadge: { backgroundColor: Colors.cyan + "22", borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 1 },
  remoteBadgeText: { fontSize: 9, fontWeight: "700", color: Colors.cyan, letterSpacing: 0.5 },

  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1, flexShrink: 0,
  },
  statusText: { fontSize: 11, fontWeight: "700" },

  salaryRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  salary: { fontSize: 12, color: Colors.success, fontWeight: "600" },

  cardActions: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap", marginTop: 2, alignItems: "center" },
  letterBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.cyan + "55",
    backgroundColor: Colors.cyan + "12",
  },
  letterBtnText: { fontSize: 11, fontWeight: "600", color: Colors.cyan },
  webActions: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap", marginTop: 2 },
  webActionBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1,
  },
  webActionText: { fontSize: 11, fontWeight: "600" },
  webDeleteBtn: {
    width: 28, height: 28, borderRadius: Radius.sm,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.danger + "18",
  },

  modalRoot: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.xl, paddingTop: 54, paddingBottom: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  modalSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },

  inputLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: Spacing.sm },
  textArea: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.lg,
    color: Colors.textPrimary, fontSize: 13, lineHeight: 20, minHeight: 160,
  },
  errorCard: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, backgroundColor: Colors.danger + "18", borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.danger + "44", padding: Spacing.lg },
  errorText: { flex: 1, color: Colors.danger, fontSize: 13 },
  generateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.cyan },
  generateBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  letterBanner: { flexDirection: "row", gap: Spacing.md, alignItems: "flex-start", backgroundColor: Colors.success + "18", borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.success + "44", padding: Spacing.lg },
  letterBannerText: { flex: 1, color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  letterBox: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  letterText: { color: Colors.textPrimary, fontSize: 13, lineHeight: 22 },
  copyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.blue },
  copyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  regenerateBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  regenerateBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },

  emptyState: { alignItems: "center", gap: Spacing.md, paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },

  generatingWrap: { alignItems: "center", gap: Spacing.lg, paddingTop: 60 },
  generatingText: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  generatingSubText: { fontSize: 12, color: Colors.textMuted },

  descPreviewBox: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg, marginTop: Spacing.sm, gap: Spacing.md,
  },
  descPreviewText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  expandBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start", paddingVertical: 4,
  },
  expandBtnText: { fontSize: 12, fontWeight: "700", color: Colors.blue },

  noDescWrap: { alignItems: "center", gap: Spacing.md, paddingTop: 40 },
  noDescTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  noDescText: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },
  pasteBtn: {
    marginTop: Spacing.sm, paddingVertical: 11, paddingHorizontal: 24,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.cyan,
    backgroundColor: Colors.cyan + "18",
  },
  pasteBtnText: { fontSize: 13, fontWeight: "700", color: Colors.cyan },
});
