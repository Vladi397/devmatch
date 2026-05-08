import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, StatusBar } from "react-native";
import Animated, {
  FadeInDown, ZoomIn,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withSpring,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle, Path, Ellipse } from "react-native-svg";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Radius, Spacing } from "@/constants/theme";

function SadFace({ color, accent }: { color: string; accent: string }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(withSequence(
      withTiming(-8, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      withTiming( 8, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }));
  return (
    <Animated.View style={style}>
      <Svg width={120} height={120} viewBox="0 0 100 100">
        {/* Face outline */}
        <Circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="3" opacity={0.8} />

        {/* Brow wrinkles — sad eyebrows */}
        <Path d="M 27 34 Q 34 30 38 33" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M 62 33 Q 66 30 73 34" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />

        {/* Eyes */}
        <Ellipse cx="34" cy="43" rx="4.5" ry="5" fill={color} />
        <Ellipse cx="66" cy="43" rx="4.5" ry="5" fill={color} />

        {/* Tear drop — left eye */}
        <Path d="M 34 50 Q 31 56 34 60 Q 37 56 34 50 Z" fill={accent} opacity={0.9} />

        {/* Frown */}
        <Path d="M 30 68 Q 50 56 70 68" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

function Btn3D({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  const scale = useSharedValue(1);
  const rotX  = useSharedValue(0);
  const anim  = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { scale: scale.value }, { rotateX: `${rotX.value}deg` }],
  }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.93, { damping: 14 }); rotX.value = withSpring(7, { damping: 12 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 14 }); rotX.value = withSpring(0, { damping: 12 }); }}
      onPress={onPress}
    >
      <Animated.View style={anim}>{children}</Animated.View>
    </Pressable>
  );
}

export default function NotFoundScreen() {
  const { colors: Colors, isDark } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: Colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Background blobs */}
      <View style={[styles.blob, styles.blobTL, { backgroundColor: Colors.danger }]} />
      <View style={[styles.blob, styles.blobBR, { backgroundColor: Colors.blue  }]} />

      <View style={styles.center}>
        {/* Animated sad face */}
        <Animated.View entering={ZoomIn.duration(600).springify()} style={styles.faceWrap}>
          <SadFace color={Colors.danger} accent={Colors.blue} />
        </Animated.View>

        {/* 404 */}
        <Animated.Text
          entering={FadeInDown.delay(150).duration(400)}
          style={[styles.code, { color: Colors.blue }]}
        >
          404
        </Animated.Text>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(250).duration(400)}
          style={[styles.title, { color: Colors.textPrimary }]}
        >
          Page Not Found
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={FadeInDown.delay(350).duration(400)}
          style={[styles.subtitle, { color: Colors.textSecondary }]}
        >
          Looks like this route got lost in the cloud.{"\n"}
          Your data is safe - let's get you home.
        </Animated.Text>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.actions}>
          <Btn3D onPress={() => router.replace("/(tabs)/dashboard" as any)}>
            <View style={[styles.btnPrimary, { backgroundColor: Colors.blue }]}>
              <Ionicons name="home-outline" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Go Home</Text>
            </View>
          </Btn3D>

          <Btn3D onPress={() => router.back()}>
            <View style={[styles.btnSecondary, { borderColor: Colors.border }]}>
              <Ionicons name="arrow-back-outline" size={16} color={Colors.textSecondary} />
              <Text style={[styles.btnSecondaryText, { color: Colors.textSecondary }]}>Go Back</Text>
            </View>
          </Btn3D>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  blob: { position: "absolute", borderRadius: 999, opacity: 0.1 },
  blobTL: { width: 280, height: 280, top: -130, left: -110 },
  blobBR: { width: 220, height: 220, bottom: 30,  right: -80  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
    gap: 12,
  },

  faceWrap: { marginBottom: 8 },

  code: {
    fontSize: 80,
    fontWeight: "800",
    lineHeight: 88,
    letterSpacing: -2,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.2,
  },

  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 4,
    marginBottom: 8,
  },

  actions: { gap: Spacing.md, width: "100%", marginTop: 8 },

  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: Radius.full,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  btnSecondaryText: { fontWeight: "600", fontSize: 15 },
});
