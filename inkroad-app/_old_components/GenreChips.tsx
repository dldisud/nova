import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { genreChipsData } from '../data/dummyHome';
import { MaterialIcons } from '@expo/vector-icons';

const getIconName = (id: string): keyof typeof MaterialIcons.glyphMap | undefined => {
  switch (id) {
    case 'all': return 'menu';
    case 'romance': return 'favorite';
    case 'fantasy': return 'flash-on';
    case 'scifi': return 'science';
    default: return undefined;
  }
};

export default function GenreChips() {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {genreChipsData.map((genre) => {
          const iconName = getIconName(genre.id);
          return (
            <TouchableOpacity key={genre.id} style={styles.chip} activeOpacity={0.7}>
              {iconName && <MaterialIcons name={iconName} size={15} color="#bfa97a" style={styles.icon} />}
              <Text style={styles.chipText}>{genre.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(191, 169, 122, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 0, // gap handles horizontal spacing
  },
  icon: {
    marginRight: 4,
  },
  chipText: {
    color: '#bfa97a',
    fontSize: 13,
    fontWeight: '600',
  },
});
