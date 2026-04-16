import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function SearchScreen() {
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

  return (
    <View style={styles.container}>
      {session ? (
        <Text style={styles.text}>내 서재 (My Library) - 준비 중</Text>
      ) : (
        <View style={styles.authContainer}>
          <Text style={styles.authMessage}>로그인하여 내 서재를 이용해보세요.</Text>
          <TouchableOpacity onPress={() => router.push('/auth')} style={styles.authButton}>
            <Text style={styles.authButtonText}>로그인 하기</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  text: { fontSize: 20, color: '#fff' },
  authContainer: {
    alignItems: 'center',
    gap: 16,
  },
  authMessage: {
    color: '#aaa',
    fontSize: 16,
  },
  authButton: {
    backgroundColor: '#007AFF', // Primary color
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  authButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
