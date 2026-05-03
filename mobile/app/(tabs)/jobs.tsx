import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Platform,
} from "react-native";
import Animated, {
  FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle,
  withSpring, withDelay, withRepeat, withSequence, withTiming, Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { DevMatchLogo } from "@/components/DevMatchLogo";
import { JobCard, type Job } from "@/components/JobCard";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Radius, Spacing } from "@/constants/theme";

const API_URL = Platform.OS === "web"
  ? "http://localhost:3000"
  : "http://192.168.0.3:3000";

const ROLES: { label: string; query: string }[] = [
  { label: "Frontend", query: "frontend developer" },
  { label: "Backend", query: "backend developer" },
  { label: "Full Stack", query: "full stack developer" },
  { label: "Cloud", query: "cloud engineer" },
  { label: "DevOps", query: "devops" },
  { label: "Mobile", query: "mobile developer" },
  { label: "Data", query: "data engineer" },
];

const COUNTRIES: { flag: string; label: string; code: string }[] = [
  { flag: "🇬🇧", label: "UK", code: "gb" },
  { flag: "🇩🇪", label: "DE", code: "de" },
  { flag: "🇳🇱", label: "NL", code: "nl" },
  { flag: "🇫🇷", label: "FR", code: "fr" },
  { flag: "🇧🇪", label: "BE", code: "be" },
  { flag: "🇦🇹", label: "AT", code: "at" },
  { flag: "🇮🇹", label: "IT", code: "it" },
  { flag: "🇵🇱", label: "PL", code: "pl" },
];

// ─── Pulsing dot loader ───
function PulseDot({ delay, color = Colors.blue }: { delay: number; color?: string }) {
  const opacity = useSharedValue(0.25);
  const scale = useSharedValue(0.7);
  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(
      withSequence(withTiming(1, { duration: 450 }), withTiming(0.25, { duration: 450 })), -1
    ));
    scale.value = withDelay(delay, withRepeat(
      withSequence(withTiming(1, { duration: 450 }), withTiming(0.7, { duration: 450 })), -1
    ));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return <Animated.View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }, style]} />;
}

function JobsLoader() {
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.loaderWrap}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <PulseDot delay={0} color={Colors.blue} />
        <PulseDot delay={150} color={Colors.cyan} />
        <PulseDot delay={300} color={Colors.blue} />
      </View>
      <Text style={styles.loadingText}>Finding jobs for you…</Text>
    </Animated.View>
  );
}

// ─── Animated job card wrapper ───
function AnimatedJobCard({ job, index, saved, onSave }: { job: Job; index: number; saved: boolean; onSave: () => void }) {
  const stagger = Math.min(index * 60, 360);
  return (
    <Animated.View entering={FadeInDown.delay(stagger).duration(350).springify()}>
      <JobCard job={job} saved={saved} onSave={onSave} />
    </Animated.View>
  );
}

// ─── Filter chip with press scale ───
function RoleChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <TouchableOpacity
        style={[styles.roleChip, active && styles.roleChipActive]}
        onPress={() => {
          scale.value = withSequence(withSpring(0.9), withSpring(1));
          onPress();
        }}
        activeOpacity={0.8}
      >
        <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function JobsScreen() {
  const { getToken } = useAuth();
  const [selectedRole, setSelectedRole] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const fetchJobs = useCallback(async (role: number, country: number, nextPage: number, append = false) => {
    try {
      append ? setLoadingMore(true) : setLoading(true);
      setError(null);
      const token = await getToken();
      const q = encodeURIComponent(ROLES[role].query);
      const c = COUNTRIES[country].code;
      const res = await fetch(`${API_URL}/jobs?q=${q}&country=${c}&page=${nextPage}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch jobs");
      const incoming: Job[] = data.jobs ?? [];
      setJobs((prev) => append ? [...prev, ...incoming] : incoming);
      setHasMore(incoming.length >= 10);
      setPage(nextPage);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchJobs(selectedRole, selectedCountry, 1, false);
  }, [selectedRole, selectedCountry]);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/applications/ids`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setSavedIds(new Set(data.ids));
        }
      } catch {}
    })();
  }, []);

  async function handleSave(job: Job) {
    try {
      const token = await getToken();
      await fetch(`${API_URL}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          externalId: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          remote: job.remote,
          salary: job.salary,
          url: job.url,
          source: job.source,
          tags: job.tags,
          postedAt: job.postedAt,
          description: job.description,
        }),
      });
      setSavedIds((prev) => new Set([...prev, job.id]));
    } catch {}
  }

  function handleRoleChange(i: number) {
    if (i === selectedRole) return;
    setSelectedRole(i);
    setJobs([]);
    setPage(1);
    setHasMore(true);
  }

  function handleCountryChange(i: number) {
    if (i === selectedCountry) return;
    setSelectedCountry(i);
    setJobs([]);
    setPage(1);
    setHasMore(true);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <DevMatchLogo size="sm" />
        <Text style={styles.headerTitle}>JOBS</Text>
      </Animated.View>

      {/* Country picker */}
      <Animated.View entering={FadeInDown.delay(80).duration(400)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterContent}
        >
          {COUNTRIES.map((c, i) => (
            <TouchableOpacity
              key={c.code}
              style={[styles.countryChip, i === selectedCountry && styles.countryChipActive]}
              onPress={() => handleCountryChange(i)}
              activeOpacity={0.7}
            >
              <Text style={styles.countryFlag}>{c.flag}</Text>
              <Text style={[styles.countryLabel, i === selectedCountry && styles.countryLabelActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Role filter */}
      <Animated.View entering={FadeInDown.delay(160).duration(400)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterContent}
        >
          {ROLES.map((r, i) => (
            <RoleChip
              key={r.query}
              label={r.label}
              active={i === selectedRole}
              onPress={() => handleRoleChange(i)}
            />
          ))}
        </ScrollView>
      </Animated.View>

      {/* List */}
      {loading ? (
        <JobsLoader />
      ) : error ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchJobs(selectedRole, selectedCountry, 1, false)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <Animated.View entering={FadeInUp.delay(100).duration(300)} style={styles.listHeader}>
            <Text style={styles.listHeaderText}>
              {ROLES[selectedRole].label} · {COUNTRIES[selectedCountry].flag} {COUNTRIES[selectedCountry].label}
            </Text>
            <Text style={styles.listCount}>{jobs.length} listings</Text>
          </Animated.View>

          {jobs.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No jobs found. Try a different role or country.</Text>
            </Animated.View>
          ) : (
            <>
              {jobs.map((job, i) => (
                <AnimatedJobCard
                  key={job.id}
                  job={job}
                  index={i}
                  saved={savedIds.has(job.id)}
                  onSave={() => handleSave(job)}
                />
              ))}

              {hasMore && (
                <Animated.View entering={FadeInDown.delay(200).duration(300)}>
                  <TouchableOpacity
                    style={styles.loadMoreBtn}
                    onPress={() => fetchJobs(selectedRole, selectedCountry, page + 1, true)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        <PulseDot delay={0} />
                        <PulseDot delay={150} />
                        <PulseDot delay={300} />
                      </View>
                    ) : (
                      <Text style={styles.loadMoreText}>Load More</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              )}
            </>
          )}

          <Text style={styles.attribution}>Jobs powered by Adzuna & Remotive</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: 54,
    paddingBottom: Spacing.md,
  },
  headerTitle: { fontSize: 13, fontWeight: "800", color: Colors.textMuted, letterSpacing: 2 },

  filterBar: { maxHeight: 48, flexShrink: 0 },
  filterContent: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, paddingBottom: 6 },

  countryChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  countryChipActive: { borderColor: Colors.blue, backgroundColor: Colors.blue + "18" },
  countryFlag: { fontSize: 14 },
  countryLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  countryLabelActive: { color: Colors.blue },

  roleChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  roleChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  roleChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
  roleChipTextActive: { color: "#fff", fontWeight: "700" },

  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.lg },
  loadingText: { fontSize: 13, color: Colors.textSecondary },

  scroll: { flex: 1, paddingHorizontal: Spacing.xl },
  listHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: Spacing.md,
  },
  listHeaderText: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  listCount: { fontSize: 12, color: Colors.textMuted },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md, padding: Spacing.xl },
  errorText: { fontSize: 13, color: Colors.danger, textAlign: "center" },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: Radius.md, backgroundColor: Colors.blue },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  emptyState: { alignItems: "center", gap: Spacing.md, paddingTop: 60 },
  emptyText: { fontSize: 13, color: Colors.textSecondary, textAlign: "center" },

  loadMoreBtn: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.lg, minHeight: 48,
  },
  loadMoreText: { fontSize: 14, fontWeight: "600", color: Colors.blue },
  attribution: { textAlign: "center", fontSize: 10, color: Colors.textMuted, paddingBottom: Spacing.md },
});
