import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
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
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true, 
      });

      if (result.canceled) return;
      
      setIsUploading(true);
      setUploadStatus("Preparing file...");
      const file = result.assets[0];

      const formData = new FormData();

      // Handle file differently depending on Web vs Mobile
      if (Platform.OS === 'web') {
        if (file.file) {
          formData.append('resume', file.file);
        } else {
          throw new Error("Web file extraction failed.");
        }
      } else {
        let finalUri = file.uri;
        if (Platform.OS === 'android' && file.uri.startsWith('content://')) {
          const fileInfo = await FileSystem.getInfoAsync(file.uri);
          if (fileInfo.exists) {
             finalUri = fileInfo.uri;
          }
        } else if (Platform.OS === 'ios') {
          finalUri = file.uri.replace('file://', '');
        }

        formData.append('resume', {
          uri: finalUri,
          name: file.name || 'resume.pdf',
          type: file.mimeType || 'application/pdf',
        } as any);
      }

      setUploadStatus("Sending to server...");
      const token = await getToken();
      
      const response = await fetch(`${API_URL}/resume/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed on server');
      }

      setUploadStatus("Resume saved successfully!");
    } catch (error: any) {
      console.error("Upload Error Details:", error);
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
    textAlign: 'center',
  }
});