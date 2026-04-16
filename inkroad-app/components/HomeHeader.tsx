import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>INKROAD</Text>
      {/* We can add profile/notification icons here later */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 48, // Safe area approx for initial layout
    paddingBottom: 16,
    backgroundColor: '#0e0d12',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
