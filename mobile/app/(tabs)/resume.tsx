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
import { API_URL } from "@/constants/api";

