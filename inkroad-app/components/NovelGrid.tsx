import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import { novelGridData, NovelData } from '../data/dummyHome';

import { Link } from 'expo-router';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const PADDING = 16;
const GAP = 12;
// Calculate item width dynamically to ensure exactly 2 columns fit on screen
const ITEM_WIDTH = (width - (PADDING * 2) - (GAP * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

export default function NovelGrid() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>인기 상승작</Text>
      <View style={styles.grid}>
        {novelGridData.map((novel: NovelData) => (
          <Link key={novel.id} href={`/novel/${novel.id}`} asChild>
            <TouchableOpacity style={styles.gridItem} activeOpacity={0.8}>
              <Image source={{ uri: novel.coverUrl }} style={styles.coverImage} />
              <Text style={styles.title} numberOfLines={1}>{novel.title}</Text>
              <Text style={styles.author} numberOfLines={1}>{novel.author}</Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: PADDING,
    marginTop: 20,
    marginBottom: 40,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: ITEM_WIDTH,
    marginBottom: 20,
  },
  coverImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: '#1E1E24',
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  author: {
    color: '#aaaaaa',
    fontSize: 13,
  },
});
