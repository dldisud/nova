import React from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";

// Mock data matching the original HTML
const coinTiers = [
  { tier: 500, amount: "500 G", price: "₩5,000", bonus: null, featured: false },
  { tier: 1000, amount: "1,000 G", price: "₩10,000", bonus: "+100 G 보너스", featured: false },
  { tier: 5000, amount: "5,000 G", price: "₩50,000", bonus: "+1,000 G 보너스", featured: true },
  { tier: 10000, amount: "10,000 G", price: "₩100,000", bonus: "+2,500 G 보너스", featured: false },
];

export default function PaymentScreen() {
  const handleBuy = (tierAmount: string) => {
    Alert.alert("안내", `${tierAmount}를 충전하시겠습니까?`);
  };

  return (
    <View style={styles.shell}>
      <SafeAreaView edges={["top"]} />
      <AppHeader title="코인 충전" />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>보유 코인</Text>
          <Text style={styles.balanceValue}>0 G</Text>
        </View>

        <Text style={styles.tierTitle}>충전 패키지</Text>

        {/* Tier List */}
        <View style={styles.tierList}>
          {coinTiers.map((tier) => (
            <View key={tier.tier} style={[styles.tierCard, tier.featured && styles.tierCardFeatured]}>
              {tier.featured && (
                <View style={styles.tierBadge}>
                  <Text style={styles.tierBadgeText}>인기</Text>
                </View>
              )}
              
              <View style={styles.tierInfo}>
                <Text style={styles.tierAmount}>{tier.amount}</Text>
                <Text style={styles.tierPrice}>{tier.price}</Text>
                {tier.bonus && <Text style={styles.tierBonus}>{tier.bonus}</Text>}
              </View>

              <TouchableOpacity 
                style={[styles.tierBtn, tier.featured && styles.tierBtnPrimary]} 
                onPress={() => handleBuy(tier.amount)}
              >
                <Text style={[styles.tierBtnText, tier.featured && styles.tierBtnTextPrimary]}>충전</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Notice */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>결제 안내</Text>
          <View style={styles.noticeList}>
            <Text style={styles.noticeItem}>• 충전된 코인은 5년간 유효합니다.</Text>
            <Text style={styles.noticeItem}>• 모든 결제는 PG사를 통해 안전하게 처리됩니다.</Text>
            <Text style={styles.noticeItem}>• 미사용 코인은 충전 후 7일 이내 환불 가능합니다.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  /* Balance Card */
  balanceCard: {
    backgroundColor: '#d4a843', // fallback for gradient: linear-gradient(135deg, #d4a843, #b88a2e)
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.8,
    color: '#0a0a0a',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: '#0a0a0a',
  },
  /* Tier List */
  tierTitle: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "700",
    color: '#f0e6d3',
  },
  tierList: {
    gap: 10,
    marginBottom: 24,
  },
  tierCard: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(191, 169, 122, 0.15)',
    borderRadius: 12,
  },
  tierCardFeatured: {
    borderColor: '#d4a843',
    backgroundColor: 'rgba(212, 168, 67, 0.08)',
  },
  tierBadge: {
    position: "absolute",
    top: -8,
    right: 16,
    backgroundColor: '#d4a843',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  tierBadgeText: {
    color: '#0a0a0a',
    fontSize: 10,
    fontWeight: "800",
  },
  tierInfo: {
    gap: 4,
  },
  tierAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: '#f0e6d3',
  },
  tierPrice: {
    fontSize: 14,
    color: '#7a6f5f',
  },
  tierBonus: {
    fontSize: 11,
    color: '#4ade80',
    fontWeight: "600",
  },
  tierBtn: {
    height: 40,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191, 169, 122, 0.15)',
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tierBtnPrimary: {
    backgroundColor: '#d4a843',
    borderColor: '#d4a843',
  },
  tierBtnText: {
    color: '#f0e6d3',
    fontWeight: "700",
    fontSize: 14,
  },
  tierBtnTextPrimary: {
    color: '#0a0a0a',
  },
  /* Notice */
  noticeCard: {
    padding: 20,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(191, 169, 122, 0.15)',
    borderRadius: 12,
  },
  noticeTitle: {
    marginBottom: 12,
    fontSize: 14,
    fontWeight: "700",
    color: '#f0e6d3',
  },
  noticeList: {
    gap: 6,
  },
  noticeItem: {
    fontSize: 12,
    color: '#7a6f5f',
    lineHeight: 18,
  },
});
