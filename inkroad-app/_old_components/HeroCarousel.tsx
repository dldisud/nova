import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity } from 'react-native';
import { heroCarouselData, NovelData } from '../data/dummyHome';
import { Link } from 'expo-router';

const { width } = Dimensions.get('window');

export default function HeroCarousel() {
  const renderItem = ({ item }: { item: NovelData }) => (
    <Link href={`/novel/${item.id}`} asChild>
      <TouchableOpacity activeOpacity={0.9} style={styles.cardContainer}>
        <Image source={{ uri: item.coverUrl }} style={styles.image} />
        
        {/* Basic View overlay instead of LinearGradient to prevent Expo Dev Client crashes without rebuild */}
        <View style={styles.gradient} />
        
        <View style={styles.inner}>
          <View style={styles.badges}>
            <View style={[styles.badge, styles.badgeGenre]}>
              <Text style={styles.badgeGenreText}>{item.genre}</Text>
            </View>
          </View>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{item.synopsis}</Text>
          <View style={styles.actions}>
            <View style={styles.btnPrimary}>
              <Text style={styles.btnPrimaryText}>보러가기</Text>
            </View>
            <View style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>+</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
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
        decelerationRate="fast"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width,
    height: 420,
    backgroundColor: '#1a1a1a',
  },
  cardContainer: {
    width: width,
    height: 420,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // Simulated single fallback color 
    zIndex: 1,
  },
  inner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: 'flex-end',
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeGenre: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgeGenreText: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 32,
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.72)',
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  btnPrimary: {
    flex: 1,
    height: 46,
    backgroundColor: '#d4a843',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#0a0a0a',
    fontSize: 14,
    fontWeight: '800',
  },
  btnSecondary: {
    width: 46,
    height: 46,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 12,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  }
});
