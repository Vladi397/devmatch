import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Share,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { API_URL } from "@/constants/api";


const NOTIF_KEY = "notif_prefs";

async function loadItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function saveItem(key: string, value: string) {
  if (Platform.OS === "web") localStorage.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}

type SettingRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  danger?: boolean;
};

function SettingRow({ icon, label, onPress, toggle, toggleValue, onToggle, danger }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={toggle ? 1 : 0.7}>
      <Ionicons name={icon} size={17} color={danger ? Colors.danger : Colors.blue} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, danger && { color: Colors.danger }]}>{label}</Text>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: Colors.border, true: Colors.blue }}
          thumbColor="#fff"
        />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen() {
  const { logout, getToken } = useAuth();

  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  // Notification preferences
  const [notifJobs, setNotifJobs] = useState(true);
  const [notifApps, setNotifApps] = useState(true);
  const [notifInterview, setNotifInterview] = useState(false);

  // Change password modal
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Edit profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await loadItem("auth_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed);
        setEditName(parsed.name ?? "");
      }
      const prefsRaw = await loadItem(NOTIF_KEY);
      if (prefsRaw) {
        const prefs = JSON.parse(prefsRaw);
        setNotifJobs(prefs.jobs ?? true);
        setNotifApps(prefs.apps ?? true);
        setNotifInterview(prefs.interview ?? false);
      }
    })();
  }, []);

  async function persistNotifs(jobs: boolean, apps: boolean, interview: boolean) {
    await saveItem(NOTIF_KEY, JSON.stringify({ jobs, apps, interview }));
  }

  async function handleChangePassword() {
    setPwError(null);
    if (!currentPw || !newPw || !confirmPw) {
      setPwError("All fields are required.");
      return;
    }
    if (newPw.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }
    try {
      setPwLoading(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowPwModal(false);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      Alert.alert("Success", "Password changed successfully.");
    } catch (err: any) {
      setPwError(err.message ?? "Something went wrong.");
    } finally {
      setPwLoading(false);
    }
  }

  async function handleEditProfile() {
    if (!editName.trim()) return;
    try {
      setEditLoading(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const updated = { ...user, name: data.user.name };
      setUser(updated);
      await saveItem("auth_user", JSON.stringify(updated));
      setShowEditModal(false);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not update profile.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleInviteFriends() {
    try {
      await Share.share({
        message: "Check out DevMatch — it helps you find and apply to jobs with AI! Download the app and join me.",
        title: "Join DevMatch",
      });
    } catch {
      // user cancelled
    }
  }

  function handleDataPrivacy() {
    Alert.alert(
      "Data & Privacy",
      "DevMatch stores your resume and job preferences to provide personalised job matches.\n\nYour data is never sold to third parties. You can delete your account at any time to remove all stored data.\n\nFor questions, contact support@devmatch.app",
      [{ text: "OK" }]
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile block */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <Ionicons name="person-outline" size={32} color={Colors.blue} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? "—"}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? "—"}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setShowEditModal(true)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <SettingRow
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => { setPwError(null); setShowPwModal(true); }}
          />
          <SettingRow
            icon="document-text-outline"
            label="Upload New Resume"
            onPress={() => router.push("/(tabs)/resume")}
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={styles.section}>
          <SettingRow
            icon="briefcase-outline"
            label="Job Matches Notifications"
            toggle
            toggleValue={notifJobs}
            onToggle={(v) => { setNotifJobs(v); persistNotifs(v, notifApps, notifInterview); }}
          />
          <SettingRow
            icon="mail-outline"
            label="Applications Updates"
            toggle
            toggleValue={notifApps}
            onToggle={(v) => { setNotifApps(v); persistNotifs(notifJobs, v, notifInterview); }}
          />
          <SettingRow
            icon="calendar-outline"
            label="Interview Notifications"
            toggle
            toggleValue={notifInterview}
            onToggle={(v) => { setNotifInterview(v); persistNotifs(notifJobs, notifApps, v); }}
          />
        </View>

        {/* General */}
        <SectionHeader title="General" />
        <View style={styles.section}>
          <SettingRow icon="shield-outline" label="Data and Privacy" onPress={handleDataPrivacy} />
          <SettingRow icon="people-outline" label="Invite Friends" onPress={handleInviteFriends} />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPwModal} transparent animationType="slide" onRequestClose={() => setShowPwModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Current password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              value={currentPw}
              onChangeText={setCurrentPw}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="New password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              value={newPw}
              onChangeText={setNewPw}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm new password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              value={confirmPw}
              onChangeText={setConfirmPw}
            />

            {pwError && <Text style={styles.errorText}>{pwError}</Text>}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPwModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleChangePassword} disabled={pwLoading}>
                {pwLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Display name"
              placeholderTextColor={Colors.textMuted}
              value={editName}
              onChangeText={setEditName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleEditProfile} disabled={editLoading}>
                {editLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  scroll: { flex: 1, paddingHorizontal: Spacing.xl },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgInput,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  profileEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editBtnText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },

  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  section: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowIcon: { marginRight: Spacing.md },
  rowLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: "400" },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 15,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.danger + "44",
    backgroundColor: Colors.danger + "11",
  },
  logoutText: { color: Colors.danger, fontSize: 15, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalCard: {
    width: "100%",
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  modalInput: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: "600" },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.blue,
    alignItems: "center",
  },
  confirmBtnText: { color: "#fff", fontWeight: "700" },
});
