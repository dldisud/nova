import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function AuthModal() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [penName, setPenName] = useState('');

  const toggleView = () => setIsLogin(!isLogin);

  const handleSubmit = async () => {
    if (loading) return;

    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('로그인 실패', error.message);
      } else {
        router.back(); // Redirect back on success
      }
    } else {
      if (password !== passwordConfirm) {
        Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
        setLoading(false);
        return;
      }
      if (!penName) {
        Alert.alert('오류', '닉네임을 입력해주세요.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: penName,
          }
        }
      });

      if (error) {
        Alert.alert('회원가입 실패', error.message);
      } else {
        Alert.alert('가입 성공!', '로그인 되었습니다.');
        router.back();
      }
    }

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>{isLogin ? 'INKROAD' : '회원가입'}</Text>
            <Text style={styles.subtitle}>
              {isLogin ? '글로벌 웹소설 스토어에 오신 것을 환영합니다.' : 'INKROAD와 함께 새로운 이야기를 시작하세요.'}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Signup specific fields */}
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>닉네임</Text>
                <TextInput
                  style={styles.input}
                  placeholder="독자에게 표시될 이름"
                  placeholderTextColor="#666"
                  value={penName}
                  onChangeText={setPenName}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>비밀번호</Text>
              <TextInput
                style={styles.input}
                placeholder={isLogin ? "비밀번호를 입력하세요" : "6자 이상 입력하세요"}
                placeholderTextColor="#666"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>비밀번호 확인</Text>
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호를 다시 입력하세요"
                  placeholderTextColor="#666"
                  secureTextEntry
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                />
              </View>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} activeOpacity={0.8} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isLogin ? '로그인' : '가입하기'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {isLogin && (
            <>
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>또는</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.socialContainer}>
                <TouchableOpacity style={[styles.socialButton, styles.googleButton]} activeOpacity={0.8}>
                  <Text style={styles.googleButtonText}>Google로 계속</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.socialButton, styles.kakaoButton]} activeOpacity={0.8}>
                  <Text style={styles.kakaoButtonText}>카카오로 계속</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isLogin ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
            </Text>
            <TouchableOpacity onPress={toggleView}>
              <Text style={styles.footerLink}>
                {isLogin ? '회원가입' : '로그인'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0a0a0a',
    padding: 24,
    paddingTop: 60, // Top margin for modal
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#dddddd',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    color: '#ffffff',
    padding: 16,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#333333',
  },
  dividerText: {
    color: '#666666',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  socialContainer: {
    gap: 12,
    marginBottom: 32,
  },
  socialButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: 'transparent',
    borderColor: '#333333',
  },
  googleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    borderColor: '#FEE500',
  },
  kakaoButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 40,
  },
  footerText: {
    color: '#888888',
    fontSize: 14,
  },
  footerLink: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  }
});
