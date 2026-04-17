// mobile/app/(tabs)/index.tsx (or dashboard.tsx)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Radius, Spacing } from '@/constants/theme';

const API_URL = Platform.OS === "web" 
  ? "http://localhost:3000" 
  : "http://192.168.178.214:3000";

export default function DashboardScreen() {
  const { getToken } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleResumeUpload = async () => {
    try {
      // 1. Open the phone's file picker (restricted to PDFs)
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      
      setIsUploading(true);
      setUploadStatus("Extracting text...");
      const file = result.assets[0];

      // 2. Prepare the file for upload
      const formData = new FormData();
      formData.append('resume', {
        uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);

      // 3. Send to backend
      const token = await getToken();
      const response = await fetch(`${API_URL}/resume/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Do NOT set Content-Type manually. Fetch will automatically set the correct boundary for multipart/form-data.
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setUploadStatus("Resume saved successfully!");
    } catch (error: any) {
      console.error(error);
      setUploadStatus(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Master Resume</Text>
      
      <TouchableOpacity 
        style={[styles.button, isUploading && styles.buttonDisabled]} 
        onPress={handleResumeUpload}
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Upload PDF Resume</Text>
        )}
      </TouchableOpacity>

      {uploadStatus && (
        <Text style={styles.statusText}>{uploadStatus}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xl,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.blue,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: Radius.full,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  statusText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: 14,
  }
});