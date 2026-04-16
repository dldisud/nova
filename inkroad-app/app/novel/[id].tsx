import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { getNovelById } from '../../data/dummyHome';

const { width, height } = Dimensions.get('window');

export default function NovelDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // We make sure `id` is a string
  const novelId = Array.isArray(id) ? id[0] : id;
  const novel = getNovelById(novelId);

  if (!novel) return <Text style={{ marginTop: 100, textAlign: 'center' }}>Not Found</Text>;

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: '', 
          headerTransparent: true, 
          headerTintColor: '#fff' 
        }} 
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Backdrop (In a real app, use expo-blur, but here we can just lower opacity plus a dark backgroundColor) */}
        <View style={styles.backdropContainer}>
            <Image 
              source={{ uri: novel.coverUrl }} 
              style={styles.backdropImage} 
              blurRadius={10} 
            />
            <View style={styles.backdropOverlay} />
        </View>

        <View style={styles.content}>
          <View style={styles.heroSection}>
            <Image source={{ uri: novel.coverUrl }} style={styles.frontCover} />
            <View style={styles.heroInfo}>
              <Text style={styles.title}>{novel.title}</Text>
              <Text style={styles.author}>{novel.author}</Text>
              <View style={styles.tagsContainer}>
                {novel.genre && <Text style={styles.tag}>{novel.genre}</Text>}
                {novel.views && <Text style={styles.statTag}>조회수 {novel.views}만</Text>}
              </View>
            </View>
          </View>
          
          <View style={styles.synopsisContainer}>
            <Text style={styles.sectionHeader}>작품 소개</Text>
            <Text style={styles.synopsisText} numberOfLines={4}>
              {novel.synopsis || '내용이 없습니다.'}
            </Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Floating Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
          <Text style={styles.actionButtonText}>첫화 보기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', 
  },
  scrollContent: {
    paddingBottom: 120, // Leave room for fixed action bar
  },
  backdropContainer: {
    width: width,
    height: height * 0.45,
    position: 'absolute',
    top: 0,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 18, 18, 0.8)', // Fades the backdrop back into the dark theme
  },
  content: {
    marginTop: height * 0.15, // Pushes content down over the backdrop
    paddingHorizontal: 20,
    position: 'relative',
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  frontCover: {
    width: 120,
    height: 175,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroInfo: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  author: {
    fontSize: 16,
    color: '#bbbbbb',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: '#333333',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
    fontSize: 12,
  },
  statTag: {
    backgroundColor: 'rgba(233, 30, 99, 0.2)', // Pinkish tint
    color: '#E91E63',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
    fontSize: 12,
  },
  synopsisContainer: {
    marginTop: 10,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  synopsisText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#dddddd',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32, // Accommodates safe area
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionButton: {
    backgroundColor: '#007AFF', // Primary Blue
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
