import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { AppHeader } from "../components/AppHeader";
import { supabase } from "../../../lib/supabase";

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");

  const handleSubmit = async () => {
    if (loading) return;
    if (!email || !password) {
      Alert.alert("입력 오류", "이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.back();
        return;
      }

      if (password !== passwordConfirm) {
        Alert.alert("입력 오류", "비밀번호 확인이 일치하지 않습니다.");
        return;
      }

      if (!nickname.trim()) {
        Alert.alert("입력 오류", "닉네임을 입력해주세요.");
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: nickname,
          },
        },
      });

      if (error) throw error;

      Alert.alert("가입 완료", "이메일 인증 후 로그인해주세요.");
      setIsLogin(true);
      setPassword("");
      setPasswordConfirm("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      Alert.alert(isLogin ? "로그인 실패" : "회원가입 실패", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.shell}>
      <SafeAreaView edges={["top"]} />
      <AppHeader title={isLogin ? "로그인" : "회원가입"} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.authView}>
            
            {/* Header */}
            <View style={styles.headerBox}>
              <Text style={styles.brandTitle}>{isLogin ? "INKROAD" : "회원가입"}</Text>
              <Text style={styles.subtitle}>
                {isLogin 
                  ? "글로벌 웹소설 스토어에 오신 것을 환영합니다." 
                  : "INKROAD와 함께 새로운 이야기를 시작하세요."}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formGroup}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>이메일</Text>
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="email@example.com"
                  placeholderTextColor="#4a4a4a"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>비밀번호</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder={isLogin ? "비밀번호를 입력하세요" : "6자 이상 입력하세요"}
                  placeholderTextColor="#4a4a4a"
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {!isLogin && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>비밀번호 확인</Text>
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      placeholder="비밀번호를 다시 입력하세요"
                      placeholderTextColor="#4a4a4a"
                      value={passwordConfirm}
                      onChangeText={setPasswordConfirm}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>닉네임</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="독자에게 표시될 이름"
                      placeholderTextColor="#4a4a4a"
                      value={nickname}
                      onChangeText={setNickname}
                    />
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#0a0a0a" />
                ) : (
                  <Text style={styles.btnPrimaryText}>{isLogin ? "로그인" : "가입하기"}</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            {isLogin && (
              <>
                <View style={styles.dividerBox}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>또는</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Social Login */}
                <View style={styles.socialGroup}>
                  <TouchableOpacity style={styles.btnSecondary} onPress={() => Alert.alert("OAuth", "구글 로그인 준비 중")}>
                    <Text style={styles.btnSecondaryText}>Google로 계속</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnKakao} onPress={() => Alert.alert("OAuth", "카카오 로그인 준비 중")}>
                    <Text style={styles.btnKakaoText}>카카오로 계속</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Footer Link */}
            <View style={styles.footerLinkBox}>
              <Text style={styles.footerLinkText}>
                {isLogin ? "계정이 없으신가요? " : "이미 계정이 있으신가요? "}
              </Text>
              <TouchableOpacity onPress={() => setIsLogin((current) => !current)}>
                <Text style={styles.footerLinkAction}>{isLogin ? "회원가입" : "로그인"}</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  authView: {
    width: "100%",
    maxWidth: 400,
  },
  /* Header */
  headerBox: {
    alignItems: "center",
    marginBottom: 32,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: '#d4a843',
    letterSpacing: -0.84, // -3% of 28
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#7a6f5f',
    lineHeight: 22,
    textAlign: "center",
  },
  /* Form */
  formGroup: {
    gap: 16,
    marginBottom: 24,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: '#7a6f5f',
    marginLeft: 4,
  },
  input: {
    width: "100%",
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(191, 169, 122, 0.15)',
    borderRadius: 10,
    color: '#f0e6d3',
    fontSize: 15,
  },
  /* Buttons */
  btnPrimary: {
    height: 50,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#d4a843',
  },
  btnPrimaryText: {
    color: '#0a0a0a',
    fontSize: 15,
    fontWeight: "700",
  },
  btnSecondary: {
    height: 50,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  btnSecondaryText: {
    color: '#111111',
    fontSize: 15,
    fontWeight: "700",
  },
  btnKakao: {
    height: 50,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#FEE500',
  },
  btnKakaoText: {
    color: '#191919',
    fontSize: 15,
    fontWeight: "700",
  },
  /* Divider */
  dividerBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(191, 169, 122, 0.15)',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#7a6f5f',
  },
  /* Social */
  socialGroup: {
    gap: 10,
    marginBottom: 24,
  },
  /* Footer */
  footerLinkBox: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerLinkText: {
    fontSize: 13,
    color: '#7a6f5f',
  },
  footerLinkAction: {
    fontSize: 13,
    color: '#d4a843',
    fontWeight: "600",
  },
});
