import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions } from 'react-native';
import { heroCarouselData, NovelData } from '../data/dummyHome';

const { width } = Dimensions.get('window');

// We want the card to take up almost the full width, leaving a bit of margin
const CARD_WIDTH = width - 32;

export default function HeroCarousel() {
  const renderItem = ({ item }: { item: NovelData }) => (
    <View style={styles.cardContainer}>
      <Image source={{ uri: item.coverUrl }} style={styles.image} />
      <View style={styles.overlay}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.author}>{item.author}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={heroCarouselData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={CARD_WIDTH + 16} // card width + separator
        decelerationRate="fast"
        ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E1E24',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  author: {
    color: '#ccc',
    fontSize: 14,
  },
});
