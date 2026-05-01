import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DevMatchLogo } from "@/components/DevMatchLogo";
import { JobCard, type Job } from "@/components/JobCard";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Radius, Spacing } from "@/constants/theme";

const API_URL = Platform.OS === "web"
  ? "http://localhost:3000"
  : "http://192.168.178.214:3000";

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

      <View style={styles.header}>
        <DevMatchLogo size="sm" />
        <Text style={styles.headerTitle}>JOBS</Text>
      </View>

      {/* Country picker */}
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
          >
            <Text style={styles.countryFlag}>{c.flag}</Text>
            <Text style={[styles.countryLabel, i === selectedCountry && styles.countryLabelActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Role filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {ROLES.map((r, i) => (
          <TouchableOpacity
            key={r.query}
            style={[styles.roleChip, i === selectedRole && styles.roleChipActive]}
            onPress={() => handleRoleChange(i)}
          >
            <Text style={[styles.roleChipText, i === selectedRole && styles.roleChipTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.blue} size="large" />
          <Text style={styles.loadingText}>Fetching jobs…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchJobs(selectedRole, selectedCountry, 1, false)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>
              {ROLES[selectedRole].label} · {COUNTRIES[selectedCountry].flag} {COUNTRIES[selectedCountry].label}
            </Text>
            <Text style={styles.listCount}>{jobs.length} listings</Text>
          </View>

          {jobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No jobs found. Try a different role or country.</Text>
            </View>
          ) : (
            <>
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}

              {hasMore && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => fetchJobs(selectedRole, selectedCountry, page + 1, true)}
                  disabled={loadingMore}
                >
                  {loadingMore
                    ? <ActivityIndicator color={Colors.blue} size="small" />
                    : <Text style={styles.loadMoreText}>Load More</Text>
                  }
                </TouchableOpacity>
              )}
            </>
          )}

          <Text style={styles.attribution}>
            Jobs powered by Adzuna & Remotive
          </Text>
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
  headerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 2,
  },

  filterBar: { maxHeight: 48, flexShrink: 0 },
  filterContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    paddingBottom: 6,
  },

  countryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  countryChipActive: { borderColor: Colors.blue, backgroundColor: Colors.blue + "18" },
  countryFlag: { fontSize: 14 },
  countryLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  countryLabelActive: { color: Colors.blue },

  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  roleChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  roleChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
  roleChipTextActive: { color: "#fff", fontWeight: "700" },

  scroll: { flex: 1, paddingHorizontal: Spacing.xl },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  listHeaderText: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  listCount: { fontSize: 12, color: Colors.textMuted },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md, padding: Spacing.xl },
  loadingText: { fontSize: 13, color: Colors.textSecondary },
  errorText: { fontSize: 13, color: Colors.danger, textAlign: "center" },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: Radius.md, backgroundColor: Colors.blue },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  emptyState: { alignItems: "center", gap: Spacing.md, paddingTop: 60 },
  emptyText: { fontSize: 13, color: Colors.textSecondary, textAlign: "center" },

  loadMoreBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    minHeight: 48,
  },
  loadMoreText: { fontSize: 14, fontWeight: "600", color: Colors.blue },

  attribution: {
    textAlign: "center",
    fontSize: 10,
    color: Colors.textMuted,
    paddingBottom: Spacing.md,
  },
});
