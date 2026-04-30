import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform, Modal, ScrollView, StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedProps, useAnimatedStyle,
  withTiming, withDelay, withRepeat, withSequence,
  FadeInDown, FadeInUp, ZoomIn, Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Radius, Spacing } from '@/constants/theme';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:3000'
  : 'http://192.168.178.214:3000';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type StoredResume = { id: string; fileUrl: string; content: string; uploadedAt: string };
type ScanResult = { score: number; summary: string; strengths: string[]; weaknesses: string[]; suggestions: string[]; keywords: string[] };

// ─── Pulsing dot (used in loading animations) ───
function PulseDot({ delay, color = Colors.blue }: { delay: number; color?: string }) {
  const opacity = useSharedValue(0.25);
  const scale = useSharedValue(0.7);

  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(
      withSequence(withTiming(1, { duration: 500 }), withTiming(0.25, { duration: 500 })),
      -1
    ));
    scale.value = withDelay(delay, withRepeat(
      withSequence(withTiming(1, { duration: 500 }), withTiming(0.7, { duration: 500 })),
      -1
    ));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }, style]} />;
}

// ─── Scanning loading state ───
function ScanningCard({ text }: { text: string }) {
  return (
    <View style={styles.scanningCard}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <PulseDot delay={0} />
        <PulseDot delay={180} />
        <PulseDot delay={360} />
      </View>
      <Text style={styles.scanningText}>{text}</Text>
    </View>
  );
}

// ─── Improving loading state ───
function ImprovingCard() {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 2200, easing: Easing.linear }), -1);
    scale.value = withRepeat(
      withSequence(withTiming(1.15, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
  }));

  return (
    <View style={styles.scanningCard}>
      <Animated.View style={iconStyle}>
        <Ionicons name="sparkles" size={28} color={Colors.cyan} />
      </Animated.View>
      <Text style={styles.scanningText}>DevMatch is improving your resume...</Text>
    </View>
  );
}

// ─── Animated SVG score ring ───
function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? Colors.success : score >= 50 ? Colors.cyan : Colors.danger;
  const label = score >= 75 ? 'ATS Ready' : score >= 50 ? 'Needs Work' : 'Needs Attention';

  const RADIUS = 52;
  const STROKE = 7;
  const SIZE = (RADIUS + STROKE) * 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(150, withTiming(score / 100, {
      duration: 1400,
      easing: Easing.out(Easing.cubic),
    }));
  }, [score]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <Animated.View entering={ZoomIn.delay(100).duration(500).springify()} style={styles.scoreRingWrap}>
      <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={Colors.border} strokeWidth={STROKE} fill="none" />
          <AnimatedCircle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            stroke={color} strokeWidth={STROKE} fill="none"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={animatedProps}
            strokeLinecap="round"
            transform={`rotate(-90, ${SIZE / 2}, ${SIZE / 2})`}
          />
        </Svg>
        <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
        <Text style={styles.scoreOutOf}>/ 100</Text>
      </View>
      <Text style={[styles.scoreGrade, { color }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── Staggered result card ───
function ResultCard({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 90).duration(400).springify()}>
      <View style={styles.resultCard}>{children}</View>
    </Animated.View>
  );
}

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

export default function ResumeScreen() {
  const { getToken } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [storedResume, setStoredResume] = useState<StoredResume | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [improvedData, setImprovedData] = useState<{ improvements: string[]; resumeData: any } | null>(null);
  const [showFixModal, setShowFixModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [newScanResult, setNewScanResult] = useState<ScanResult | null>(null);

  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    loadLatestResume();
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); };
  }, []);

  async function loadLatestResume() {
    try {
      setIsLoading(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/resume/latest`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setStoredResume((await res.json()).resume);
    } catch { } finally { setIsLoading(false); }
  }

  async function scanResume() {
    try {
      setScanning(true); setScanError(null);
      const token = await getToken();
      const res = await fetch(`${API_URL}/ats/scan`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Scan failed.');
      setScanResult(data.analysis);
    } catch (err: any) { setScanError(err.message ?? 'Something went wrong.'); }
    finally { setScanning(false); }
  }

  async function handleResumeUpload() {
    try {
      setUploadError(null);
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (result.canceled) return;

      setIsUploading(true); setScanResult(null); setScanError(null);
      const file = result.assets[0];
      const formData = new FormData();

      if (Platform.OS === 'web') {
        if (!file.file) throw new Error('Could not read file.');
        formData.append('resume', file.file);
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(file.file);
        blobUrlRef.current = url;
        setPreviewBlobUrl(url);
      } else {
        let finalUri = file.uri;
        if (Platform.OS === 'android' && file.uri.startsWith('content://')) {
          const info = await FileSystem.getInfoAsync(file.uri);
          if (info.exists) finalUri = info.uri;
        } else if (Platform.OS === 'ios') finalUri = file.uri.replace('file://', '');
        formData.append('resume', { uri: finalUri, name: file.name || 'resume.pdf', type: 'application/pdf' } as any);
      }

      const token = await getToken();
      const response = await fetch(`${API_URL}/resume/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Upload failed.');
      setStoredResume(data.resume);
      await scanResume();
    } catch (err: any) { setUploadError(err.message ?? 'Something went wrong.'); }
    finally { setIsUploading(false); }
  }

  async function handleImprove() {
    try {
      setImproving(true); setImproveError(null); setImprovedData(null); setNewScanResult(null);
      const token = await getToken();
      const res = await fetch(`${API_URL}/ats/improve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Improvement failed.');
      setImprovedData(data);
      setShowFixModal(true);
    } catch (err: any) { setImproveError(err.message ?? 'Something went wrong.'); }
    finally { setImproving(false); }
  }

  function handleFixModalClose() {
    if (newScanResult) setScanResult(newScanResult);
    setShowFixModal(false);
    setNewScanResult(null);
  }

  async function handleDownloadImproved() {
    if (!improvedData?.resumeData || Platform.OS !== 'web') return;
    try {
      setDownloading(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/ats/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resumeData: improvedData.resumeData }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Download failed.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'improved-resume.pdf'; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { setImproveError(err.message ?? 'Download failed.'); }
    finally { setDownloading(false); }
  }

  async function handleApplyImproved() {
    if (!improvedData?.resumeData) return;
    try {
      setApplying(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/ats/save-improved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resumeData: improvedData.resumeData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Failed to apply.');
      setStoredResume(data.resume);
      setNewScanResult(data.analysis);
    } catch (err: any) { setImproveError(err.message ?? 'Something went wrong.'); }
    finally { setApplying(false); }
  }

  function handleDownload() {
    if (Platform.OS !== 'web') return;
    const src = previewBlobUrl || (storedResume?.content ? URL.createObjectURL(new Blob([storedResume.content], { type: 'text/plain' })) : null);
    if (!src) return;
    const a = document.createElement('a');
    a.href = src; a.download = previewBlobUrl ? (storedResume?.fileUrl ?? 'resume.pdf') : 'resume.txt'; a.click();
    if (!previewBlobUrl) URL.revokeObjectURL(src);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PulseDot delay={0} color={Colors.blue} />
          <PulseDot delay={180} color={Colors.cyan} />
          <PulseDot delay={360} color={Colors.blue} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MASTER RESUME</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {storedResume ? (
          <>
            {/* Resume card */}
            <Animated.View entering={FadeInDown.duration(500).springify()}>
              <View style={styles.resumeCard}>
                <View style={styles.resumeCardTop}>
                  <View style={styles.fileIconBox}>
                    <Ionicons name="document-text" size={28} color={Colors.blue} />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{storedResume.fileUrl}</Text>
                    <Text style={styles.fileDate}>Uploaded {formatDate(storedResume.uploadedAt)}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>ACTIVE</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.previewBtn} onPress={() => setShowPreview(true)}>
                    <Ionicons name="eye-outline" size={16} color="#fff" />
                    <Text style={styles.previewBtnText}>Preview</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reuploadBtn} onPress={handleResumeUpload} disabled={isUploading || scanning}>
                    {isUploading
                      ? <ActivityIndicator size="small" color={Colors.blue} />
                      : <><Ionicons name="cloud-upload-outline" size={16} color={Colors.blue} /><Text style={styles.reuploadBtnText}>Re-upload</Text></>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>

            {uploadError && <Text style={styles.errorText}>{uploadError}</Text>}

            {/* ATS section divider */}
            <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.sectionDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>ATS SCORE</Text>
              <View style={styles.dividerLine} />
            </Animated.View>

            {scanning && <ScanningCard text="Scanning your resume..." />}

            {!scanResult && !scanning && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <TouchableOpacity style={styles.scanBtn} onPress={scanResume}>
                  <Ionicons name="analytics-outline" size={18} color="#fff" />
                  <Text style={styles.scanBtnText}>Scan My Resume</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {scanError && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
                <Text style={styles.errorCardText}>{scanError}</Text>
              </View>
            )}

            {scanResult && (
              <>
                <ScoreRing score={scanResult.score} />

                <ResultCard index={0}>
                  <Text style={styles.resultCardTitle}>Summary</Text>
                  <Text style={styles.bodyText}>{scanResult.summary}</Text>
                </ResultCard>

                {scanResult.strengths?.length > 0 && (
                  <ResultCard index={1}>
                    <View style={styles.titleRow}>
                      <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                      <Text style={styles.resultCardTitle}>Strengths</Text>
                    </View>
                    {scanResult.strengths.map((s, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Text style={[styles.bullet, { color: Colors.success }]}>•</Text>
                        <Text style={styles.bodyText}>{s}</Text>
                      </View>
                    ))}
                  </ResultCard>
                )}

                {scanResult.weaknesses?.length > 0 && (
                  <ResultCard index={2}>
                    <View style={styles.titleRow}>
                      <Ionicons name="close-circle" size={15} color={Colors.danger} />
                      <Text style={styles.resultCardTitle}>Weaknesses</Text>
                    </View>
                    {scanResult.weaknesses.map((w, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Text style={[styles.bullet, { color: Colors.danger }]}>•</Text>
                        <Text style={styles.bodyText}>{w}</Text>
                      </View>
                    ))}
                  </ResultCard>
                )}

                {scanResult.suggestions?.length > 0 && (
                  <ResultCard index={3}>
                    <View style={styles.titleRow}>
                      <Ionicons name="bulb-outline" size={15} color={Colors.cyan} />
                      <Text style={styles.resultCardTitle}>Suggestions</Text>
                    </View>
                    {scanResult.suggestions.map((s, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Text style={[styles.bullet, { color: Colors.cyan }]}>•</Text>
                        <Text style={styles.bodyText}>{s}</Text>
                      </View>
                    ))}
                  </ResultCard>
                )}

                {scanResult.keywords?.length > 0 && (
                  <ResultCard index={4}>
                    <View style={styles.titleRow}>
                      <Ionicons name="pricetag-outline" size={15} color={Colors.blue} />
                      <Text style={styles.resultCardTitle}>Detected Keywords</Text>
                    </View>
                    <View style={styles.chipRow}>
                      {scanResult.keywords.map((k) => (
                        <Chip key={k} label={k} color={Colors.blue} bg={Colors.blue + '22'} />
                      ))}
                    </View>
                  </ResultCard>
                )}

                <Animated.View entering={FadeInDown.delay(500).duration(400)} style={{ gap: Spacing.sm }}>
                  <TouchableOpacity style={styles.rescanBtn} onPress={scanResume}>
                    <Ionicons name="refresh-outline" size={15} color={Colors.textSecondary} />
                    <Text style={styles.rescanBtnText}>Re-scan</Text>
                  </TouchableOpacity>

                  {improving ? (
                    <ImprovingCard />
                  ) : (
                    <TouchableOpacity style={styles.fixBtn} onPress={handleImprove}>
                      <Ionicons name="construct-outline" size={18} color="#fff" />
                      <Text style={styles.fixBtnText}>Fix It — Generate Improved Resume</Text>
                    </TouchableOpacity>
                  )}

                  {improveError && (
                    <View style={styles.errorCard}>
                      <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
                      <Text style={styles.errorCardText}>{improveError}</Text>
                    </View>
                  )}
                </Animated.View>
              </>
            )}
          </>
        ) : (
          <Animated.View entering={ZoomIn.duration(500).springify()} style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Resume Yet</Text>
            <Text style={styles.emptySubtitle}>Upload your PDF and we'll instantly scan it for ATS compatibility.</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={handleResumeUpload} disabled={isUploading}>
              {isUploading
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="cloud-upload-outline" size={18} color="#fff" /><Text style={styles.uploadBtnText}>Upload PDF Resume</Text></>
              }
            </TouchableOpacity>
            {uploadError && <Text style={styles.errorText}>{uploadError}</Text>}
          </Animated.View>
        )}
      </ScrollView>

      {/* Fix It Modal */}
      <Modal visible={showFixModal} animationType="slide" onRequestClose={handleFixModalClose}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Improved Resume Ready</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleFixModalClose}>
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg }}>

            {/* Banner */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.improveBanner}>
              <Ionicons name="sparkles" size={22} color={Colors.success} />
              <Text style={styles.improveBannerText}>
                DevMatch has rewritten your resume to be more ATS-friendly. Apply it to set it as your active resume, or download the PDF.
              </Text>
            </Animated.View>

            {/* Before / After scores */}
            {newScanResult ? (
              <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.scoreCompareRow}>
                <View style={styles.scoreCompareBox}>
                  <Text style={styles.scoreCompareLabel}>Before</Text>
                  <Text style={[styles.scoreCompareBig, { color: Colors.danger }]}>{scanResult?.score ?? '—'}</Text>
                </View>
                <Ionicons name="arrow-forward" size={22} color={Colors.textMuted} />
                <View style={styles.scoreCompareBox}>
                  <Text style={styles.scoreCompareLabel}>After</Text>
                  <Text style={[styles.scoreCompareBig, { color: Colors.success }]}>{newScanResult.score}</Text>
                </View>
              </Animated.View>
            ) : null}

            {/* What was improved */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <View style={styles.resultCard}>
                <View style={styles.titleRow}>
                  <Ionicons name="list-outline" size={15} color={Colors.cyan} />
                  <Text style={styles.resultCardTitle}>What Was Improved</Text>
                </View>
                {improvedData?.improvements?.map((imp, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={[styles.bullet, { color: Colors.success }]}>✓</Text>
                    <Text style={styles.bodyText}>{imp}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Actions */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ gap: Spacing.md }}>
              {improveError && (
                <View style={styles.errorCard}>
                  <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
                  <Text style={styles.errorCardText}>{improveError}</Text>
                </View>
              )}

              {/* Apply button — saves text directly, re-scans, shows score */}
              {!newScanResult ? (
                <TouchableOpacity
                  style={[styles.fixBtn, applying && { opacity: 0.6 }]}
                  onPress={handleApplyImproved}
                  disabled={applying}
                >
                  {applying
                    ? <><ActivityIndicator color="#fff" size="small" /><Text style={styles.fixBtnText}>Applying & Scanning...</Text></>
                    : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={styles.fixBtnText}>Apply Improved Resume</Text></>
                  }
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.fixBtn} onPress={handleFixModalClose}>
                  <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                  <Text style={styles.fixBtnText}>Done — View New Score</Text>
                </TouchableOpacity>
              )}

              {/* Download PDF (web only) */}
              {Platform.OS === 'web' && (
                <TouchableOpacity
                  style={[styles.rescanBtn, downloading && { opacity: 0.6 }]}
                  onPress={handleDownloadImproved}
                  disabled={downloading}
                >
                  {downloading
                    ? <><ActivityIndicator color={Colors.textSecondary} size="small" /><Text style={styles.rescanBtnText}>Generating PDF...</Text></>
                    : <><Ionicons name="download-outline" size={15} color={Colors.textSecondary} /><Text style={styles.rescanBtnText}>Download as PDF</Text></>
                  }
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.rescanBtn} onPress={handleFixModalClose}>
                <Text style={styles.rescanBtnText}>Keep Original</Text>
              </TouchableOpacity>
            </Animated.View>

          </ScrollView>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={showPreview} animationType="slide" onRequestClose={() => setShowPreview(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Resume Preview</Text>
            <View style={styles.modalActions}>
              {Platform.OS === 'web' && (
                <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
                  <Ionicons name="download-outline" size={16} color="#fff" />
                  <Text style={styles.downloadBtnText}>Download</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowPreview(false)}>
                <Ionicons name="close" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.modalBody}>
            {Platform.OS === 'web' && previewBlobUrl ? (
              // @ts-ignore
              <iframe src={previewBlobUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Resume Preview" />
            ) : (
              <ScrollView style={styles.textScroll} contentContainerStyle={{ padding: Spacing.xl }}>
                <Text style={styles.extractedText}>{storedResume?.content ?? 'No content available.'}</Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.xl, paddingTop: 54, paddingBottom: Spacing.lg },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 2 },
  scroll: { padding: Spacing.xl, paddingBottom: 48 },

  resumeCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: Spacing.xl,
  },
  resumeCardTop: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  fileIconBox: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.blue + '18', alignItems: 'center', justifyContent: 'center' },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  fileDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm, backgroundColor: Colors.blue + '22' },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.blue, letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: Colors.border },
  cardActions: { flexDirection: 'row', padding: Spacing.lg, gap: Spacing.md },
  previewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: Radius.md, backgroundColor: Colors.blue },
  previewBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  reuploadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.blue },
  reuploadBtnText: { color: Colors.blue, fontWeight: '700', fontSize: 14 },

  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5 },

  scanningCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, padding: Spacing.xl,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  scanningText: { color: Colors.textSecondary, fontSize: 14 },

  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.blue, marginBottom: Spacing.lg },
  scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  errorCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.danger + '18', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.danger + '44', padding: Spacing.lg, marginBottom: Spacing.lg },
  errorCardText: { color: Colors.danger, fontSize: 13, flex: 1 },
  errorText: { color: Colors.danger, fontSize: 13, textAlign: 'center', marginTop: Spacing.sm },

  scoreRingWrap: { alignItems: 'center', paddingVertical: Spacing.xl },
  scoreNumber: { fontSize: 40, fontWeight: '800' },
  scoreOutOf: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  scoreGrade: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5, marginTop: Spacing.md },

  resultCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultCardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.3 },
  bodyText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: 14, fontWeight: '800', marginTop: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  chipText: { fontSize: 12, fontWeight: '600' },

  fixBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.cyan + 'dd' },
  fixBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  improveBanner: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', backgroundColor: Colors.success + '18', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.success + '44', padding: Spacing.lg },
  improveBannerText: { flex: 1, color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },

  scoreCompareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl },
  scoreCompareBox: { alignItems: 'center', gap: 4 },
  scoreCompareLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  scoreCompareBig: { fontSize: 48, fontWeight: '800', lineHeight: 52 },

  rescanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  rescanBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },

  emptyCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.xxxl, alignItems: 'center', gap: Spacing.md, marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.md, paddingVertical: 13, paddingHorizontal: 28, borderRadius: Radius.full, backgroundColor: Colors.blue },
  uploadBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  modalRoot: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingTop: 54, paddingBottom: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.bgCard },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.md, backgroundColor: Colors.blue },
  downloadBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  closeBtn: { width: 34, height: 34, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  modalBody: { flex: 1 },
  textScroll: { flex: 1, backgroundColor: Colors.bg },
  extractedText: { color: Colors.textPrimary, fontSize: 13, lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
