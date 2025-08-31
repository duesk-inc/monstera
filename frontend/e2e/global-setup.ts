import type { FullConfig } from '@playwright/test'

// ここでは将来のストレージステート作成や、バックエンドのヘルスチェック等を拡張可能
export default async function globalSetup(_config: FullConfig) {
  // 現状は特に準備不要（UIログインで対応）
}

