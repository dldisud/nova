import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import HomeHeader from '../../components/HomeHeader';
import HeroCarousel from '../../components/HeroCarousel';
import GenreChips from '../../components/GenreChips';
import NovelGrid from '../../components/NovelGrid';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <HomeHeader />
      <HeroCarousel />
      <GenreChips />
      <NovelGrid />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0d12', // INKROAD dark background
  },
});
