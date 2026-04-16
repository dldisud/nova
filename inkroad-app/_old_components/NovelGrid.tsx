import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import { novelGridData, NovelData } from '../data/dummyHome';
import { MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const PADDING = 20;
const GAP = 12;
// Calculate item width dynamically
const ITEM_WIDTH = (width - (PADDING * 2) - (GAP * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

export default function NovelGrid() {
  return (
    <View style={styles.container}>
      <View style={styles.sectionHead}>
        <View>
          <Text style={styles.sectionTitle}>인기 작품</Text>
          <Text style={styles.sectionSub}>독자들이 가장 많이 읽은 작품</Text>
        </View>
        <TouchableOpacity style={styles.moreBtn}>
          <Text style={styles.moreBtnText}>전체 보기</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.grid}>
        {novelGridData.map((novel: NovelData, index: number) => (
          <Link key={novel.id} href={`/novel/${novel.id}`} asChild>
            <TouchableOpacity style={styles.card} activeOpacity={0.8}>
              <View style={styles.cardCover}>
                <Image source={{ uri: novel.coverUrl }} style={styles.image} />
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.title} numberOfLines={1}>{novel.title}</Text>
                <Text style={styles.author} numberOfLines={1}>{novel.author}</Text>
                <View style={styles.cardBottom}>
                  <View style={styles.ratingBox}>
                    <MaterialIcons name="star" size={12} color="#b8860b" />
                    <Text style={styles.ratingText}>4.{9 - index}</Text>
                  </View>
                  <Text style={styles.viewsText}>{(novel.views / 1000).toFixed(1)}k</Text>
                </View>
              </View>
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
    marginTop: 28,
    marginBottom: 40,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f0e6d3', // var(--mh-text)
    letterSpacing: -0.5,
    lineHeight: 23,
  },
  sectionSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#7a6f5f', // var(--mh-text-muted)
    lineHeight: 16,
  },
  moreBtn: {
    marginTop: 4,
  },
  moreBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7a6f5f',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: ITEM_WIDTH,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14, // var(--mh-radius)
    overflow: 'hidden',
  },
  cardCover: {
    width: '100%',
    aspectRatio: 0.72,
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  rankBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  rankText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  cardInfo: {
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f0e6d3',
    lineHeight: 18,
    letterSpacing: -0.5,
  },
  author: {
    marginTop: 2,
    fontSize: 11,
    color: '#7a6f5f',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b8860b',
  },
  viewsText: {
    fontSize: 11,
    color: '#7a6f5f',
  }
});
