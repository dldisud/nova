import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
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
          <Text style={{ color: 'white' }}>Skeleton Loaded for {novel.title}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Pure dark mode background
  },
  scrollContent: {
    paddingBottom: 100,
  },
  backdropContainer: {
    width: width,
    height: height * 0.4,
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
    backgroundColor: 'rgba(18, 18, 18, 0.7)', // Fades the backdrop back into the dark theme
  },
  content: {
    marginTop: height * 0.15, // Pushes content down over the backdrop
    paddingHorizontal: 20,
    position: 'relative',
  }
});
