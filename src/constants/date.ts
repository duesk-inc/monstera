/**
 * 日付関連の定数定義
 */

/**
 * 職務経歴・資格取得年月の最小年
 * IT業界での実質的な職務経歴開始を考慮して設定
 */
export const CAREER_MIN_YEAR = 1980;

/**
 * DatePickerの最小日付を生成
 * @returns 最小日付（CAREER_MIN_YEAR年1月1日）
 */
export const getCareerMinDate = (): Date => {
  return new Date(CAREER_MIN_YEAR, 0, 1);
};

/**
 * 年の選択範囲を生成（DatePicker用）
 * @returns 最小年から現在年までの年の配列
 */
export const getYearRange = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  
  for (let year = CAREER_MIN_YEAR; year <= currentYear; year++) {
    years.push(year);
  }
  
  return years;
};

// 型定義
export type CareerDateConstants = {
  minYear: typeof CAREER_MIN_YEAR;
  minDate: Date;
};