import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { inkroadTheme } from "../theme";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showProfile?: boolean;
  onBackPress?: () => void;
}

export function AppHeader({
  title,
  showBack = false,
  showSearch = false,
  showProfile = false,
  onBackPress,
}: AppHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.leftSlot}>
          {showBack ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.iconButton}
              onPress={onBackPress ?? (() => router.back())}
            >
              <MaterialIcons name="arrow-back" size={24} color={inkroadTheme.colors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.brand} onPress={() => router.push("/")}>
              <View style={styles.brandMark}>
                <Image 
                  source={require("../../../assets/icon.png")} 
                  style={styles.logoImage} 
                />
              </View>
              <Text style={styles.brandText}>INKROAD</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.centerSlot}>
          {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
        </View>
        <View style={styles.rightSlot}>
          {showSearch ? (
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push("/search")}>
              <MaterialIcons name="search" size={24} color={inkroadTheme.colors.text} />
            </TouchableOpacity>
          ) : null}
          {showProfile ? (
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push("/profile")}>
              <MaterialIcons name="person-outline" size={24} color={inkroadTheme.colors.text} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#080808",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: inkroadTheme.colors.border,
    paddingHorizontal: 16,
    backgroundColor: "#080808",
  },
  leftSlot: {
    flex: 1.2,
    justifyContent: "center",
  },
  centerSlot: {
    flex: 2,
    alignItems: "center",
  },
  rightSlot: {
    flex: 1.2,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 4,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  brandText: {
    fontSize: 15,
    fontWeight: "800",
    color: inkroadTheme.colors.text,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: inkroadTheme.colors.text,
    letterSpacing: -0.4,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
});
