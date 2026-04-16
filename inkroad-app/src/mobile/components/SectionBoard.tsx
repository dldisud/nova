import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewProps } from "react-native";

import { inkroadTheme } from "../theme";

interface SectionBoardProps extends ViewProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionBoard({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  children,
  style,
  ...rest
}: SectionBoardProps) {
  return (
    <View style={[styles.section, style]} {...rest}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel ? (
          <TouchableOpacity onPress={onActionPress}>
            <Text style={styles.action}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: inkroadTheme.colors.text,
    letterSpacing: -0.5,
    lineHeight: 23,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: inkroadTheme.colors.textMuted,
  },
  action: {
    marginTop: 2,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "600",
    color: inkroadTheme.colors.textMuted,
  },
});
