import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Radius, Spacing } from "@/constants/theme";

type SettingRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
};

function SettingRow({ icon, label, onPress, toggle, toggleValue, onToggle }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={toggle ? 1 : 0.7}>
      <Ionicons name={icon} size={17} color={Colors.blue} style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
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
  const { logout } = useAuth();
  const [notifJobs, setNotifJobs] = useState(true);
  const [notifApps, setNotifApps] = useState(true);
  const [notifInterview, setNotifInterview] = useState(false);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile block */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <Ionicons name="person-outline" size={32} color={Colors.blue} />
            <TouchableOpacity style={styles.uploadBadge}>
              <Text style={styles.uploadBadgeText}>UPLOAD</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Vladi Georgiev</Text>
            <Text style={styles.profileEmail}>vladi.georgiev14@gmail.com</Text>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <SettingRow icon="lock-closed-outline" label="Change Password" />
          <SettingRow icon="document-text-outline" label="Upload New Resume" />
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={styles.section}>
          <SettingRow
            icon="briefcase-outline"
            label="Job Matches Notifications"
            toggle
            toggleValue={notifJobs}
            onToggle={setNotifJobs}
          />
          <SettingRow
            icon="mail-outline"
            label="Applications Updates"
            toggle
            toggleValue={notifApps}
            onToggle={setNotifApps}
          />
          <SettingRow
            icon="calendar-outline"
            label="Job Interview Notifications"
            toggle
            toggleValue={notifInterview}
            onToggle={setNotifInterview}
          />
        </View>

        {/* General */}
        <SectionHeader title="General" />
        <View style={styles.section}>
          <SettingRow icon="shield-outline" label="Data and Privacy" />
          <SettingRow icon="people-outline" label="Invite Friends" />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  uploadBadge: {
    position: "absolute",
    bottom: -8,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  uploadBadgeText: { fontSize: 8, color: Colors.textSecondary, fontWeight: "600", letterSpacing: 0.5 },
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
});