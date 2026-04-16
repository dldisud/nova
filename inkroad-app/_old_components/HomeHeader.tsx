import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { MaterialIcons } from '@expo/vector-icons';

export default function HomeHeader() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleProfilePress = () => {
    if (session) {
      router.push('/profile');
    } else {
      router.push('/auth');
    }
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.brand} onPress={() => {}} activeOpacity={0.8}>
        <View style={styles.brandMark}>
          <MaterialIcons name="menu-book" size={16} color="#0a0a0a" />
        </View>
        <Text style={styles.brandName}>INKROAD</Text>
      </TouchableOpacity>
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/search')}>
          <MaterialIcons name="search" size={24} color="#bfa97a" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon} onPress={handleProfilePress}>
          <MaterialIcons name="person" size={24} color="#bfa97a" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 48,
    paddingBottom: 12,
    backgroundColor: 'rgba(8, 8, 8, 0.95)', // Simulated translucent background
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    width: 28,
    height: 28,
    backgroundColor: '#d4a843',
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f0e6d3',
    letterSpacing: -0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIcon: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  }
});
