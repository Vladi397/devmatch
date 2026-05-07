import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import type { ColorPalette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/theme";

interface AuthInputProps extends TextInputProps {
  label?: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  isPassword?: boolean;
}

export function AuthInput({
  label,
  icon,
  error,
  isPassword = false,
  ...props
}: AuthInputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(isPassword);
  const { colors: Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.row,
          focused && styles.rowFocused,
          !!error && styles.rowError,
        ]}
      >
        <Ionicons
          name={icon}
          size={17}
          color={focused ? Colors.blue : Colors.textMuted}
          style={styles.iconLeft}
        />
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={17}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function makeStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    wrapper: { marginBottom: Spacing.md },
    label: {
      fontSize: 11,
      fontWeight: "600",
      color: Colors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.bgInput,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: Spacing.md,
      paddingVertical: 13,
    },
    rowFocused: { borderColor: Colors.blue },
    rowError: { borderColor: Colors.danger },
    iconLeft: { marginRight: 10 },
    input: {
      flex: 1,
      fontSize: 14,
      color: Colors.textPrimary,
      fontWeight: "400",
    },
    errorText: {
      marginTop: 5,
      fontSize: 11,
      color: Colors.danger,
      fontWeight: "500",
    },
  });
}
