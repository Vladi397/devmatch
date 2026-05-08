import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Switch, StatusBar, Modal, TextInput, Alert, Share,
  Platform, ActivityIndicator,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";
import { LANGUAGES, type LanguageCode } from "@/constants/i18n";
import type { ColorPalette } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Radius, Spacing } from "@/constants/theme";
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

const AVATAR_COLORS = ["#2D6EF5", "#00C97A", "#FF6B6B", "#F59E0B", "#8B5CF6", "#06B6D4", "#EC4899"];
function avatarColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "?";
}

type SettingRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  danger?: boolean;
};

function SettingRow({ icon, label, sub, onPress, toggle, toggleValue, onToggle, danger }: SettingRowProps) {
  const { colors: Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={toggle ? 1 : 0.7}>
      <View style={[styles.rowIconWrap, { backgroundColor: (danger ? Colors.danger : Colors.blue) + "18" }]}>
        <Ionicons name={icon} size={15} color={danger ? Colors.danger : Colors.blue} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && { color: Colors.danger }]}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: Colors.border, true: Colors.blue }}
          thumbColor="#fff"
        />
      ) : (
        <Ionicons name="chevron-forward" size={15} color={Colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title, index }: { title: string; index: number }) {
  const { colors: Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)} style={styles.sectionHeaderWrap}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionHeader}>{title}</Text>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const { logout, getToken } = useAuth();
  const { colors: Colors, isDark, toggle } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [notifJobs, setNotifJobs] = useState(true);
  const [notifApps, setNotifApps] = useState(true);
  const [notifInterview, setNotifInterview] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
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
    if (!currentPw || !newPw || !confirmPw) { setPwError("All fields are required."); return; }
    if (newPw.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setPwError("New passwords do not match."); return; }
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
      Alert.alert(t("settings.success"), t("settings.passwordChanged"));
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
        Alert.alert(t("settings.success"), err.message ?? "Could not update profile.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleInviteFriends() {
    try {
      await Share.share({ message: t("settings.shareMessage"), title: t("settings.shareTitle") });
    } catch {}
  }

  function handleDataPrivacy() {
    Alert.alert(t("settings.dataPrivacyTitle"), t("settings.dataPrivacyBody"), [{ text: "OK" }]);
  }

  const displayName = user?.name ?? "";
  const color = displayName ? avatarColor(displayName) : Colors.blue;

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>{t("settings.title")}</Text>
      </Animated.View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Profile card */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.profileCard}>
          <View style={[styles.avatarBox, { backgroundColor: color + "22", borderColor: color + "55" }]}>
            <Text style={[styles.avatarText, { color }]}>
              {displayName ? initials(displayName) : "?"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? "—"}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? "—"}</Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowEditModal(true);
            }}
          >
            <Ionicons name="pencil-outline" size={13} color={Colors.blue} />
            <Text style={styles.editBtnText}>{t("settings.edit")}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Account */}
        <SectionHeader title={t("settings.account")} index={0} />
        <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.section}>
          <SettingRow
            icon="lock-closed-outline"
            label={t("settings.changePassword")}
            sub={t("settings.changePasswordSub")}
            onPress={() => { setPwError(null); setShowPwModal(true); }}
          />
          <SettingRow
            icon="document-text-outline"
            label={t("settings.uploadResume")}
            sub={t("settings.uploadResumeSub")}
            onPress={() => router.push("/(tabs)/resume")}
          />
        </Animated.View>

        {/* Notifications */}
        <SectionHeader title={t("settings.notifications")} index={1} />
        <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.section}>
          <SettingRow
            icon="briefcase-outline"
            label={t("settings.jobMatches")}
            toggle toggleValue={notifJobs}
            onToggle={(v) => { setNotifJobs(v); persistNotifs(v, notifApps, notifInterview); }}
          />
          <SettingRow
            icon="mail-outline"
            label={t("settings.appUpdates")}
            toggle toggleValue={notifApps}
            onToggle={(v) => { setNotifApps(v); persistNotifs(notifJobs, v, notifInterview); }}
          />
          <SettingRow
            icon="calendar-outline"
            label={t("settings.interviewReminders")}
            toggle toggleValue={notifInterview}
            onToggle={(v) => { setNotifInterview(v); persistNotifs(notifJobs, notifApps, v); }}
          />
        </Animated.View>

        {/* General */}
        <SectionHeader title={t("settings.general")} index={2} />
        <Animated.View entering={FadeInDown.delay(280).duration(400)} style={styles.section}>
          <SettingRow
            icon={isDark ? "moon-outline" : "sunny-outline"}
            label={t("settings.darkMode")}
            toggle
            toggleValue={isDark}
            onToggle={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggle();
            }}
          />
          <SettingRow
            icon="language-outline"
            label={t("settings.language")}
            sub={LANGUAGES.find((l) => l.code === language)?.native}
            onPress={() => setShowLangModal(true)}
          />
          <SettingRow icon="shield-checkmark-outline" label={t("settings.dataPrivacy")} sub={t("settings.dataPrivacySub")} onPress={handleDataPrivacy} />
          <SettingRow icon="people-outline" label={t("settings.inviteFriends")} sub={t("settings.inviteFriendsSub")} onPress={handleInviteFriends} />
        </Animated.View>

        {/* Sign out */}
        <Animated.View entering={FadeInDown.delay(340).duration(400)} style={{ marginTop: Spacing.sm }}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              logout();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
            <Text style={styles.logoutText}>{t("settings.signOut")}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={showLangModal} transparent animationType="slide" onRequestClose={() => setShowLangModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "80%" }]}>
            <Text style={styles.modalTitle}>{t("settings.language")}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
              {LANGUAGES.map((lang) => {
                const isActive = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langOption, isActive && { backgroundColor: Colors.blue + "12", borderColor: Colors.blue }]}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      await setLanguage(lang.code as LanguageCode);
                      setShowLangModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[styles.langNative, isActive && { color: Colors.blue }]}>{lang.native}</Text>
                    {isActive && <Ionicons name="checkmark" size={16} color={Colors.blue} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLangModal(false)}>
              <Text style={styles.cancelBtnText}>{t("language.confirm")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPwModal} transparent animationType="slide" onRequestClose={() => setShowPwModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("settings.changePassword")}</Text>
            <TextInput style={styles.modalInput} placeholder={t("settings.currentPassword")} placeholderTextColor={Colors.textMuted} secureTextEntry value={currentPw} onChangeText={setCurrentPw} />
            <TextInput style={styles.modalInput} placeholder={t("settings.newPassword")} placeholderTextColor={Colors.textMuted} secureTextEntry value={newPw} onChangeText={setNewPw} />
            <TextInput style={styles.modalInput} placeholder={t("settings.confirmNewPassword")} placeholderTextColor={Colors.textMuted} secureTextEntry value={confirmPw} onChangeText={setConfirmPw} />
            {pwError && <Text style={styles.errorText}>{pwError}</Text>}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPwModal(false)}>
                <Text style={styles.cancelBtnText}>{t("language.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleChangePassword} disabled={pwLoading}>
                {pwLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>{t("language.save")}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("settings.editProfile")}</Text>
            <TextInput style={styles.modalInput} placeholder={t("settings.displayName")} placeholderTextColor={Colors.textMuted} value={editName} onChangeText={setEditName} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelBtnText}>{t("language.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleEditProfile} disabled={editLoading}>
                {editLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>{t("language.save")}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.bg },
    header: { paddingHorizontal: Spacing.xl, paddingTop: 54, paddingBottom: Spacing.lg },
    headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary },
    scroll: { flex: 1, paddingHorizontal: Spacing.xl },

    profileCard: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.border,
      padding: Spacing.lg, marginBottom: Spacing.xl, gap: Spacing.md,
    },
    avatarBox: {
      width: 56, height: 56, borderRadius: Radius.md,
      borderWidth: 2, alignItems: "center", justifyContent: "center",
    },
    avatarText: { fontSize: 18, fontWeight: "800" },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
    profileEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    editBtn: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.blue + "55",
      backgroundColor: Colors.blue + "11",
    },
    editBtnText: { fontSize: 12, color: Colors.blue, fontWeight: "700" },

    sectionHeaderWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: Spacing.sm },
    sectionAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: Colors.blue },
    sectionHeader: {
      fontSize: 11, fontWeight: "700", color: Colors.textSecondary,
      letterSpacing: 1, textTransform: "uppercase",
    },

    section: {
      backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    },
    row: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: Spacing.lg, paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: Colors.border,
      gap: Spacing.md,
    },
    rowIconWrap: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: "500" },
    rowSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

    logoutBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm,
      paddingVertical: 15, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.danger + "44", backgroundColor: Colors.danger + "11",
    },
    logoutText: { color: Colors.danger, fontSize: 15, fontWeight: "700" },

    modalOverlay: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center", alignItems: "center", padding: Spacing.xl,
    },
    modalCard: {
      width: "100%", backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl, gap: Spacing.md,
    },
    modalTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: Spacing.sm },
    modalInput: {
      backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
      borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 12,
      color: Colors.textPrimary, fontSize: 14,
    },
    errorText: { color: Colors.danger, fontSize: 13 },
    modalButtons: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.sm },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
    cancelBtnText: { color: Colors.textSecondary, fontWeight: "600" },
    confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.blue, alignItems: "center" },
    confirmBtnText: { color: "#fff", fontWeight: "700" },
    langOption: {
      flexDirection: "row", alignItems: "center", gap: Spacing.md,
      paddingVertical: 12, paddingHorizontal: Spacing.sm,
      borderRadius: Radius.md, borderWidth: 1, borderColor: "transparent",
      marginBottom: 4,
    },
    langFlag: { fontSize: 22 },
    langNative: { flex: 1, fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
  });
}
