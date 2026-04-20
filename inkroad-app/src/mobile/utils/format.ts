/**
 * 숫자를 한국식 콤마 포맷으로 변환합니다.
 * @example formatNumber(19800) → "19,800"
 */
export function formatNumber(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("ko-KR");
}

/**
 * 코인 가격을 포맷합니다.
 * @example formatCoinPrice(500) → "500G"
 * @example formatCoinPrice(0) → "무료"
 */
export function formatCoinPrice(value: number | null | undefined): string {
  const num = Number(value ?? 0);
  if (num <= 0) return "무료";
  return `${formatNumber(num)}G`;
}

/**
 * 묶음 가격을 포맷합니다.
 * @example formatBundlePrice(19800) → "19,800G"
 */
export function formatBundlePrice(value: number | null | undefined): string {
  const num = Number(value ?? 0);
  if (num <= 0) return "무료";
  return `${formatNumber(num)}G`;
}

/**
 * 회차별 할인 가격을 계산하고 포맷합니다.
 */
export function formatDiscountedPerEp(price: number, salePercent: number): string {
  const discounted = Math.floor(price * (1 - salePercent / 100));
  return formatCoinPrice(discounted);
}
