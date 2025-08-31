import type { FullConfig } from '@playwright/test'

export default async function globalTeardown(_config: FullConfig) {
  // 後処理は現状なし
}

