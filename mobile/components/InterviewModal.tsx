import React, { useState, useEffect } from "react";
import {
  View, Text, Modal, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, ActivityIndicator,
} from "react-native";
import Animated, {
  FadeInDown, ZoomIn,
  useSharedValue, useAnimatedProps,
  withTiming, Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { API_URL } from "@/constants/api";

// Minimal app shape needed
type AppSnippet = {
  id: string;
  title: string;
  company: string;
  description?: string;
};

type Question = {
  id: number;
  question: string;
  type: "behavioral" | "technical" | "situational";
  tip: string;
};

type StarBreakdown = {
  situation: string;
  task: string;
  action: string;
  result: string;
};

type EvalResult = {
  questionId: number;
  question: string;
  score: number;
  feedback: string;
  starBreakdown: StarBreakdown;
  improvedAnswer: string;
};

type Phase = "loading" | "questions" | "evaluating" | "result" | "summary";

// ─── Score ring ───────────────────────────────────────────────────────────────
const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function ScoreRing({ score, size = 130 }: { score: number; size?: number }) {
  const color = score >= 75 ? Colors.success : score >= 50 ? Colors.cyan : Colors.danger;
  const label = score >= 75 ? "Excellent" : score >= 50 ? "Good" : "Needs Work";
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(score / 100, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [score]);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <Animated.View entering={ZoomIn.duration(500).springify()} style={styles.scoreRingWrap}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          <Circle
            cx={size / 2} cy={size / 2} r={RING_RADIUS}
            stroke={Colors.border} strokeWidth={8} fill="none"
          />
          <AnimatedCircle
            cx={size / 2} cy={size / 2} r={RING_RADIUS}
            stroke={color} strokeWidth={8} fill="none"
            strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            animatedProps={animProps}
            strokeLinecap="round"
            transform={`rotate(-90, ${size / 2}, ${size / 2})`}
          />
        </Svg>
        <View style={{ alignItems: "center" }}>
          <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
          <Text style={styles.scoreOutOf}>/ 100</Text>
        </View>
      </View>
      <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── STAR breakdown row ───────────────────────────────────────────────────────
function StarRow({ label, value, index }: { label: string; value: string; index: number }) {
  const upper = value.toUpperCase();
  const color = upper.startsWith("YES")
    ? Colors.success
    : upper.startsWith("PARTIAL")
    ? Colors.warning
    : Colors.danger;
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(300)} style={styles.starRow}>
      <View style={[styles.starDot, { backgroundColor: color }]} />
      <Text style={styles.starLabel}>{label}</Text>
      <Text style={[styles.starValue, { color }]} numberOfLines={2}>{value}</Text>
    </Animated.View>
  );
}

// ─── Type badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: Question["type"] }) {
  const map = {
    behavioral: { color: Colors.cyan, label: "Behavioral" },
    technical: { color: Colors.blue, label: "Technical" },
    situational: { color: Colors.warning, label: "Situational" },
  };
  const { color, label } = map[type];
  return (
    <View style={[styles.typeBadge, { backgroundColor: color + "22", borderColor: color + "55" }]}>
      <Text style={[styles.typeBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function InterviewModal({ app, onClose }: { app: AppSnippet | null; onClose: () => void }) {
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<EvalResult[]>([]);
  const [currentResult, setCurrentResult] = useState<EvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [improvedExpanded, setImprovedExpanded] = useState(false);

  useEffect(() => {
    if (app) {
      setPhase("loading");
      setQuestions([]);
      setCurrentIndex(0);
      setAnswer("");
      setResults([]);
      setCurrentResult(null);
      setError(null);
      setImprovedExpanded(false);
      generateQuestions(app);
    }
  }, [app]);

  async function generateQuestions(target: AppSnippet) {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/interview/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: target.title,
          company: target.company,
          jobDescription: target.description ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate questions");
      setQuestions(data.questions);
      setPhase("questions");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
      setPhase("questions");
    }
  }

  async function submitAnswer() {
    if (!app || !answer.trim()) return;
    const q = questions[currentIndex];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("evaluating");
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/interview/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: q.question, answer, jobTitle: app.title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Evaluation failed");
      const result: EvalResult = { questionId: q.id, question: q.question, ...data };
      setCurrentResult(result);
      setResults((prev) => [...prev, result]);
      setAnswer("");
      setImprovedExpanded(false);
      setPhase("result");
    } catch (err: any) {
      setError(err.message ?? "Evaluation failed");
      setPhase("questions");
    }
  }

  function handleNext() {
    if (currentIndex + 1 >= questions.length) {
      setPhase("summary");
    } else {
      setCurrentIndex((i) => i + 1);
      setCurrentResult(null);
      setPhase("questions");
    }
  }

  const overallScore = results.length > 0
    ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length)
    : 0;

  const currentQ = questions[currentIndex];

  return (
    <Modal visible={!!app} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Mock Interview</Text>
            {app && (
              <Text style={styles.headerSub} numberOfLines={1}>
                {app.title} · {app.company}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Loading ── */}
          {phase === "loading" && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.centered}>
              <ActivityIndicator color={Colors.blue} size="large" />
              <Text style={styles.centeredTitle}>Generating interview questions…</Text>
              <Text style={styles.centeredSub}>Powered by Gemini AI</Text>
            </Animated.View>
          )}

          {/* ── Error ── */}
          {!!error && phase === "questions" && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          {/* ── Questions ── */}
          {phase === "questions" && !!currentQ && (
            <Animated.View entering={FadeInDown.duration(350)} style={{ gap: Spacing.lg }}>
              {/* Progress pill */}
              <View style={styles.progressRow}>
                <View style={styles.progressPill}>
                  <Text style={styles.progressText}>Question {currentIndex + 1} of {questions.length}</Text>
                </View>
                <TypeBadge type={currentQ.type} />
              </View>

              {/* Question */}
              <View style={styles.questionCard}>
                <Text style={styles.questionText}>{currentQ.question}</Text>
              </View>

              {/* STAR tip */}
              <View style={styles.tipBar}>
                <Ionicons name="bulb-outline" size={14} color={Colors.warning} />
                <Text style={styles.tipText}>{currentQ.tip}</Text>
              </View>

              {/* Answer input */}
              <TextInput
                style={styles.answerInput}
                multiline
                placeholder="Describe your experience or approach..."
                placeholderTextColor={Colors.textMuted}
                value={answer}
                onChangeText={setAnswer}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitBtn, !answer.trim() && { opacity: 0.45 }]}
                onPress={submitAnswer}
                disabled={!answer.trim()}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Answer</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── Evaluating ── */}
          {phase === "evaluating" && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.centered}>
              <ActivityIndicator color={Colors.cyan} size="large" />
              <Text style={styles.centeredTitle}>Evaluating your answer…</Text>
              <Text style={styles.centeredSub}>Applying STAR method coaching</Text>
            </Animated.View>
          )}

          {/* ── Result ── */}
          {phase === "result" && !!currentResult && (
            <Animated.View entering={FadeInDown.duration(350)} style={{ gap: Spacing.lg }}>
              {/* Score ring */}
              <ScoreRing score={currentResult.score} />

              {/* Feedback */}
              <Animated.View entering={FadeInDown.delay(120).duration(350)} style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardAccent} />
                  <Ionicons name="chatbubble-outline" size={14} color={Colors.blue} />
                  <Text style={styles.cardTitle}>Feedback</Text>
                </View>
                <Text style={styles.feedbackText}>{currentResult.feedback}</Text>
              </Animated.View>

              {/* STAR breakdown */}
              <Animated.View entering={FadeInDown.delay(200).duration(350)} style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardAccent} />
                  <Ionicons name="star-outline" size={14} color={Colors.warning} />
                  <Text style={styles.cardTitle}>STAR Breakdown</Text>
                </View>
                <StarRow label="S" value={currentResult.starBreakdown.situation} index={0} />
                <StarRow label="T" value={currentResult.starBreakdown.task} index={1} />
                <StarRow label="A" value={currentResult.starBreakdown.action} index={2} />
                <StarRow label="R" value={currentResult.starBreakdown.result} index={3} />
              </Animated.View>

              {/* Improved answer */}
              <Animated.View entering={FadeInDown.delay(280).duration(350)} style={styles.card}>
                <TouchableOpacity
                  style={styles.cardTitleRow}
                  onPress={() => setImprovedExpanded((v) => !v)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardAccent} />
                  <Ionicons name="sparkles-outline" size={14} color={Colors.cyan} />
                  <Text style={[styles.cardTitle, { flex: 1 }]}>Improved Answer</Text>
                  <Ionicons
                    name={improvedExpanded ? "chevron-up" : "chevron-down"}
                    size={14} color={Colors.textMuted}
                  />
                </TouchableOpacity>
                {improvedExpanded && (
                  <Animated.View entering={FadeInDown.duration(250)}>
                    <Text style={styles.improvedText}>{currentResult.improvedAnswer}</Text>
                  </Animated.View>
                )}
                {!improvedExpanded && (
                  <Text style={styles.improvedHint}>Tap to see an example strong answer</Text>
                )}
              </Animated.View>

              {/* Next / Summary button */}
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                <Text style={styles.nextBtnText}>
                  {currentIndex + 1 >= questions.length ? "View Summary" : "Next Question"}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── Summary ── */}
          {phase === "summary" && (
            <Animated.View entering={FadeInDown.duration(400)} style={{ gap: Spacing.lg }}>
              <Text style={styles.summaryHeading}>Interview Complete</Text>

              <ScoreRing score={overallScore} size={150} />

              <Animated.View entering={FadeInDown.delay(200).duration(350)} style={styles.card}>
                <Text style={styles.encouragementText}>
                  {overallScore >= 75
                    ? "Strong performance! You demonstrated clear STAR structure across most questions."
                    : overallScore >= 50
                    ? "Good effort. Focus on adding measurable results to your answers for a stronger impact."
                    : "Keep practising — the STAR method takes time to master. Review the improved answers above."}
                </Text>
              </Animated.View>

              {/* Per-question scores */}
              <Animated.View entering={FadeInDown.delay(280).duration(350)} style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardAccent} />
                  <Text style={styles.cardTitle}>Question Scores</Text>
                </View>
                {results.map((r, i) => {
                  const color = r.score >= 75 ? Colors.success : r.score >= 50 ? Colors.cyan : Colors.danger;
                  return (
                    <Animated.View key={r.questionId} entering={FadeInDown.delay(i * 70).duration(300)} style={styles.summaryRow}>
                      <Text style={styles.summaryQuestion} numberOfLines={2}>Q{i + 1}: {r.question}</Text>
                      <View style={[styles.summaryScore, { backgroundColor: color + "22", borderColor: color + "55" }]}>
                        <Text style={[styles.summaryScoreText, { color }]}>{r.score}</Text>
                      </View>
                    </Animated.View>
                  );
                })}
              </Animated.View>

              <TouchableOpacity style={styles.closeFullBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.closeFullBtnText}>Close</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.bgCard,
    gap: Spacing.md,
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

  progressRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  progressPill: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  progressText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  typeBadge: {
    borderRadius: Radius.full, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  typeBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },

  questionCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl,
  },
  questionText: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary, lineHeight: 26 },

  tipBar: {
    flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm,
    backgroundColor: Colors.warning + "12", borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.warning + "33", padding: Spacing.md,
  },
  tipText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  answerInput: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, padding: Spacing.lg,
    color: Colors.textPrimary, fontSize: 14, lineHeight: 22,
    minHeight: 140, textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.blue,
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  scoreRingWrap: { alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.md },
  scoreNumber: { fontSize: 28, fontWeight: "800" },
  scoreOutOf: { fontSize: 12, color: Colors.textMuted },
  scoreLabel: { fontSize: 15, fontWeight: "700" },

  card: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: Colors.blue },
  cardTitle: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },

  feedbackText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  starRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  starDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  starLabel: { fontSize: 12, fontWeight: "800", color: Colors.textMuted, width: 14, flexShrink: 0, marginTop: 2 },
  starValue: { flex: 1, fontSize: 12, lineHeight: 18 },

  improvedHint: { fontSize: 12, color: Colors.textMuted, fontStyle: "italic" },
  improvedText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 21 },

  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.blue,
  },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  summaryHeading: {
    fontSize: 22, fontWeight: "800", color: Colors.textPrimary, textAlign: "center",
  },
  encouragementText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, textAlign: "center" },

  summaryRow: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
  },
  summaryQuestion: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  summaryScore: {
    width: 40, height: 40, borderRadius: Radius.sm,
    borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  summaryScoreText: { fontSize: 13, fontWeight: "800" },

  closeFullBtn: {
    alignItems: "center", justifyContent: "center", paddingVertical: 14,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  closeFullBtnText: { color: Colors.textSecondary, fontWeight: "700", fontSize: 15 },
});
