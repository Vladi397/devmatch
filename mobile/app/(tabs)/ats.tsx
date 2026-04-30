import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Radius, Spacing } from "@/constants/theme";

const API_URL = Platform.OS === "web"
  ? "http://localhost:3000"
  : "http://192.168.178.214:3000";

type Analysis = {
  score: number;
  summary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? Colors.success : score >= 50 ? Colors.cyan : Colors.danger;
  return (
    <View style={styles.scoreRingWrap}>
      <View style={[styles.scoreRing, { borderColor: color }]}>
        <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
        <Text style={styles.scoreLabel}>/ 100</Text>
      </View>
      <Text style={[styles.scoreGrade, { color }]}>
        {score >= 75 ? "Strong Match" : score >= 50 ? "Moderate Match" : "Weak Match"}
      </Text>
    </View>
  );
}

function KeywordChip({ label, type }: { label: string; type: "match" | "miss" }) {
  const bg = type === "match" ? Colors.success + "22" : Colors.danger + "22";
  const fg = type === "match" ? Colors.success : Colors.danger;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export default function ATSScreen() {
  const { getToken } = useAuth();
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!jobDescription.trim()) return;
    try {
      setLoading(true);
      setError(null);
      setAnalysis(null);
      const token = await getToken();
      const res = await fetch(`${API_URL}/ats/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Analysis failed");
      setAnalysis(data.analysis);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>ATS SCANNER</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Input card */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Paste Job Description</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={8}
            placeholder="Paste the full job description here..."
            placeholderTextColor={Colors.textMuted}
            value={jobDescription}
            onChangeText={setJobDescription}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.analyzeBtn, (!jobDescription.trim() || loading) && styles.analyzeBtnDisabled]}
            onPress={handleAnalyze}
            disabled={!jobDescription.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="analytics-outline" size={18} color="#fff" />
                <Text style={styles.analyzeBtnText}>Analyze Match</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Results */}
        {analysis && (
          <View style={styles.results}>
            {/* Score */}
            <ScoreRing score={analysis.score} />

            {/* Summary */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Summary</Text>
              <Text style={styles.summaryText}>{analysis.summary}</Text>
            </View>

            {/* Matched keywords */}
            {analysis.matchedKeywords.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.cardTitle}>Matched Keywords</Text>
                </View>
                <View style={styles.chipRow}>
                  {analysis.matchedKeywords.map((k) => (
                    <KeywordChip key={k} label={k} type="match" />
                  ))}
                </View>
              </View>
            )}

            {/* Missing keywords */}
            {analysis.missingKeywords.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="close-circle" size={16} color={Colors.danger} />
                  <Text style={styles.cardTitle}>Missing Keywords</Text>
                </View>
                <View style={styles.chipRow}>
                  {analysis.missingKeywords.map((k) => (
                    <KeywordChip key={k} label={k} type="miss" />
                  ))}
                </View>
              </View>
            )}

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="bulb-outline" size={16} color={Colors.cyan} />
                  <Text style={styles.cardTitle}>Suggestions</Text>
                </View>
                {analysis.suggestions.map((s, i) => (
                  <View key={i} style={styles.suggestionRow}>
                    <Text style={styles.suggestionBullet}>•</Text>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 54,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  scroll: { flex: 1, paddingHorizontal: Spacing.xl },

  // Input
  inputCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  textArea: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
    minHeight: 160,
  },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: Radius.md,
    backgroundColor: Colors.blue,
  },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.danger + "18",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.danger + "44",
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  errorText: { color: Colors.danger, fontSize: 13, flex: 1 },

  // Results
  results: { gap: Spacing.lg },

  scoreRingWrap: { alignItems: "center", paddingVertical: Spacing.xl },
  scoreRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  scoreNumber: { fontSize: 36, fontWeight: "800" },
  scoreLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },
  scoreGrade: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary, letterSpacing: 0.3 },
  summaryText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  chipText: { fontSize: 12, fontWeight: "600" },

  suggestionRow: { flexDirection: "row", gap: 8 },
  suggestionBullet: { color: Colors.cyan, fontSize: 14, fontWeight: "800", marginTop: 1 },
  suggestionText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
});
