import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform, Modal, ScrollView, StatusBar,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Radius, Spacing } from '@/constants/theme';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:3000'
  : 'http://192.168.178.214:3000';

type StoredResume = {
  id: string;
  fileUrl: string;   // stores the original filename
  content: string;
  uploadedAt: string;
};

export default function ResumeScreen() {
  const { getToken } = useAuth();

  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [storedResume, setStoredResume] = useState<StoredResume | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null); // web only

  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep blob URL alive for the session
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    loadLatestResume();
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  async function loadLatestResume() {
    try {
      setIsLoading(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/resume/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStoredResume(data.resume);
      }
    } catch {
      // no resume yet, that's fine
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResumeUpload() {
    try {
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setIsUploading(true);
      const file = result.assets[0];
      const formData = new FormData();

      if (Platform.OS === 'web') {
        if (!file.file) throw new Error('Could not read file.');
        formData.append('resume', file.file);
        // Create a blob URL for in-session PDF preview
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(file.file);
        blobUrlRef.current = url;
        setPreviewBlobUrl(url);
      } else {
        let finalUri = file.uri;
        if (Platform.OS === 'android' && file.uri.startsWith('content://')) {
          const info = await FileSystem.getInfoAsync(file.uri);
          if (info.exists) finalUri = info.uri;
        } else if (Platform.OS === 'ios') {
          finalUri = file.uri.replace('file://', '');
        }
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
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleDownload() {
    if (Platform.OS !== 'web') return;
    if (previewBlobUrl) {
      const a = document.createElement('a');
      a.href = previewBlobUrl;
      a.download = storedResume?.fileUrl ?? 'resume.pdf';
      a.click();
    } else if (storedResume?.content) {
      const blob = new Blob([storedResume.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.blue} />
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
          // ── Resume exists card ──
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
              <TouchableOpacity style={styles.reuploadBtn} onPress={handleResumeUpload} disabled={isUploading}>
                {isUploading
                  ? <ActivityIndicator size="small" color={Colors.blue} />
                  : <>
                      <Ionicons name="cloud-upload-outline" size={16} color={Colors.blue} />
                      <Text style={styles.reuploadBtnText}>Re-upload</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // ── No resume yet ──
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Resume Yet</Text>
            <Text style={styles.emptySubtitle}>Upload your PDF resume to get started with ATS analysis and job matching.</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={handleResumeUpload} disabled={isUploading}>
              {isUploading
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                    <Text style={styles.uploadBtnText}>Upload PDF Resume</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      {/* ── Preview Modal ── */}
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
              // Full PDF iframe — exactly like your screenshot
              // @ts-ignore
              <iframe
                src={previewBlobUrl}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                title="Resume Preview"
              />
            ) : (
              // Mobile / no blob URL fallback: extracted text
              <ScrollView style={styles.textScroll} contentContainerStyle={{ padding: Spacing.xl }}>
                <Text style={styles.extractedText}>
                  {storedResume?.content ?? 'No content available.'}
                </Text>
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

  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 54,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 2,
  },

  scroll: {
    flexGrow: 1,
    padding: Spacing.xl,
  },

  // ── Resume card ──
  resumeCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  resumeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  fileIconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.blue + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  fileDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.blue + '22',
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.blue, letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: Colors.border },
  cardActions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: Radius.md,
    backgroundColor: Colors.blue,
  },
  previewBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  reuploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.blue,
  },
  reuploadBtnText: { color: Colors.blue, fontWeight: '700', fontSize: 14 },

  // ── Empty state ──
  emptyCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 60,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.blue,
  },
  uploadBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  errorText: {
    marginTop: Spacing.lg,
    color: Colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },

  // ── Preview Modal ──
  modalRoot: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: 54,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.blue,
  },
  downloadBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: { flex: 1 },

  // Mobile text fallback
  textScroll: { flex: 1, backgroundColor: Colors.bg },
  extractedText: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
