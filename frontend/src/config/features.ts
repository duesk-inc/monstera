/**
 * フィーチャーフラグ設定
 * 機能の有効/無効を環境変数で制御
 */

/**
 * フィーチャーフラグの型定義
 */
export interface FeatureFlags {
  /**
   * 職務経歴の個別保存機能
   * true: 個別保存API使用
   * false: 従来の一括保存API使用
   */
  individualWorkHistorySave: boolean
  
  /**
   * 職務経歴の自動保存機能
   * true: 編集後自動保存
   * false: 手動保存のみ
   */
  workHistoryAutoSave: boolean
  
  /**
   * 職務経歴のリアルタイム同期
   * true: 他ユーザーの変更をリアルタイム反映
   * false: リロード時のみ反映
   */
  workHistoryRealTimeSync: boolean
  
  /**
   * 職務経歴のバージョン管理
   * true: 変更履歴を保存
   * false: 最新版のみ保持
   */
  workHistoryVersionControl: boolean
  
  /**
   * AI支援機能
   * true: AI提案機能を有効化
   * false: AI機能を無効化
   */
  aiAssistance: boolean
  
  /**
   * 高度な検索機能
   * true: 詳細検索を有効化
   * false: 基本検索のみ
   */
  advancedSearch: boolean
  
  /**
   * 一括操作機能
   * true: 複数選択・一括操作を有効化
   * false: 個別操作のみ
   */
  bulkOperations: boolean
  
  /**
   * エクスポート機能
   * true: PDF/Excel/Wordエクスポートを有効化
   * false: エクスポート機能を無効化
   */
  exportFeature: boolean
  
  /**
   * デバッグモード
   * true: 詳細なログ出力
   * false: 本番用ログレベル
   */
  debugMode: boolean
}

/**
 * デフォルトのフィーチャーフラグ設定
 */
const defaultFeatures: FeatureFlags = {
  individualWorkHistorySave: false,
  workHistoryAutoSave: false,
  workHistoryRealTimeSync: false,
  workHistoryVersionControl: false,
  aiAssistance: false,
  advancedSearch: false,
  bulkOperations: false,
  exportFeature: true,
  debugMode: false
}

/**
 * 環境変数からフィーチャーフラグを読み込み
 */
const loadFeatureFlags = (): FeatureFlags => {
  // 環境変数から値を取得（Next.jsの場合）
  const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
    if (typeof window === 'undefined') {
      // サーバーサイド
      return process.env[key] === 'true' || defaultValue
    } else {
      // クライアントサイド（NEXT_PUBLIC_プレフィックスが必要）
      const value = process.env[`NEXT_PUBLIC_${key}`]
      return value === 'true' || (value === undefined ? defaultValue : false)
    }
  }
  
  return {
    individualWorkHistorySave: getEnvBoolean('INDIVIDUAL_WORK_HISTORY_SAVE', defaultFeatures.individualWorkHistorySave),
    workHistoryAutoSave: getEnvBoolean('WORK_HISTORY_AUTO_SAVE', defaultFeatures.workHistoryAutoSave),
    workHistoryRealTimeSync: getEnvBoolean('WORK_HISTORY_REAL_TIME_SYNC', defaultFeatures.workHistoryRealTimeSync),
    workHistoryVersionControl: getEnvBoolean('WORK_HISTORY_VERSION_CONTROL', defaultFeatures.workHistoryVersionControl),
    aiAssistance: getEnvBoolean('AI_ASSISTANCE', defaultFeatures.aiAssistance),
    advancedSearch: getEnvBoolean('ADVANCED_SEARCH', defaultFeatures.advancedSearch),
    bulkOperations: getEnvBoolean('BULK_OPERATIONS', defaultFeatures.bulkOperations),
    exportFeature: getEnvBoolean('EXPORT_FEATURE', defaultFeatures.exportFeature),
    debugMode: getEnvBoolean('DEBUG_MODE', defaultFeatures.debugMode)
  }
}

/**
 * フィーチャーフラグのインスタンス
 */
export const features = loadFeatureFlags()

/**
 * フィーチャーフラグをチェックするヘルパー関数
 */
export const isFeatureEnabled = (featureName: keyof FeatureFlags): boolean => {
  return features[featureName]
}

/**
 * 複数のフィーチャーフラグをチェック（AND条件）
 */
export const areAllFeaturesEnabled = (...featureNames: Array<keyof FeatureFlags>): boolean => {
  return featureNames.every(name => features[name])
}

/**
 * 複数のフィーチャーフラグをチェック（OR条件）
 */
export const isAnyFeatureEnabled = (...featureNames: Array<keyof FeatureFlags>): boolean => {
  return featureNames.some(name => features[name])
}

/**
 * 開発環境でのみ有効な機能かチェック
 */
export const isDevelopmentFeature = (featureName: keyof FeatureFlags): boolean => {
  const isDev = process.env.NODE_ENV === 'development'
  return isDev && features[featureName]
}



/**
 * フィーチャーフラグのログ出力（デバッグ用）
 */
export const logFeatureFlags = (): void => {
  if (features.debugMode) {
    console.group('🚀 Feature Flags')
    Object.entries(features).forEach(([key, value]) => {
      console.log(`${key}: ${value ? '✅' : '❌'}`)
    })
    console.groupEnd()
  }
}

/**
 * フィーチャーフラグのリセット（テスト用）
 */
export const resetFeatureFlags = (): void => {
  Object.keys(features).forEach(key => {
    (features as any)[key] = defaultFeatures[key as keyof FeatureFlags]
  })
}

/**
 * フィーチャーフラグの動的更新（開発用）
 */
export const updateFeatureFlag = (name: keyof FeatureFlags, value: boolean): void => {
  if (features.debugMode) {
    console.log(`🔧 Updating feature flag: ${name} = ${value}`)
    features[name] = value
  } else {
    console.warn('Feature flag updates are only allowed in debug mode')
  }
}

// 初期化時にログ出力（開発環境のみ）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  logFeatureFlags()
}