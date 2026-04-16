import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { genreChipsData } from '../data/dummyHome';

export default function GenreChips() {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {genreChipsData.map((genre) => (
          <TouchableOpacity key={genre.id} style={styles.chip}>
            <Text style={styles.chipText}>{genre.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: '#2A2A35',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  chipText: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '500',
  },
});
