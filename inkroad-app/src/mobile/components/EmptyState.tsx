import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { inkroadTheme } from "../theme";

interface EmptyStateProps {
  title: string;
  description: string;
  buttonLabel?: string;
  href?: string;
}

export function EmptyState({ title, description, buttonLabel, href }: EmptyStateProps) {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {buttonLabel && href ? (
        <TouchableOpacity style={styles.button} onPress={() => router.push(href as never)}>
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: inkroadTheme.colors.surface,
    borderRadius: inkroadTheme.radius.lg,
    borderWidth: 1,
    borderColor: inkroadTheme.colors.border,
    padding: inkroadTheme.spacing.xl,
    alignItems: "center",
    gap: inkroadTheme.spacing.sm,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: inkroadTheme.colors.text,
  },
  description: {
    textAlign: "center",
    lineHeight: 22,
    color: inkroadTheme.colors.textMuted,
  },
  button: {
    marginTop: 4,
    backgroundColor: inkroadTheme.colors.dark,
    borderRadius: inkroadTheme.radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: inkroadTheme.colors.surface,
    fontWeight: "800",
  },
});
