/**
 * バンドルサイズ最適化ユーティリティ
 * 動的インポートとTree-shakingの最適化
 */

/**
 * 動的インポートのラッパー
 * 必要に応じてAPIモジュールを遅延ロード
 */
export class DynamicApiLoader {
  private loadedModules: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();
  
  /**
   * APIモジュールを動的にロード
   */
  async loadApiModule(moduleName: string): Promise<any> {
    // すでにロード済みの場合
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName);
    }
    
    // ロード中の場合
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }
    
    // 新規ロード
    const loadPromise = this.loadModule(moduleName);
    this.loadingPromises.set(moduleName, loadPromise);
    
    try {
      const module = await loadPromise;
      this.loadedModules.set(moduleName, module);
      this.loadingPromises.delete(moduleName);
      return module;
    } catch (error) {
      this.loadingPromises.delete(moduleName);
      throw error;
    }
  }
  
  /**
   * 実際のモジュールロード処理
   */
  private async loadModule(moduleName: string): Promise<any> {
    switch (moduleName) {
      // コアモジュール（常に必要）
      case 'core':
        return import('@/lib/api/index');
      
      // 認証モジュール（ログイン時のみ）
      case 'auth':
        return import('@/lib/api/auth');
      
      // ユーザーモジュール
      case 'user':
        return import('@/lib/api/user');
      
      // 経費モジュール（経費画面でのみ）
      case 'expense':
        return import('@/lib/api/expense');
      
      // 週報モジュール（週報画面でのみ）
      case 'weeklyReport':
        return import('@/lib/api/weeklyReport');
      
      // スキルシートモジュール
      case 'skillSheet':
        return import('@/lib/api/skillSheet');
      
      // 管理者モジュール（管理者のみ）
      case 'admin':
        return import('@/lib/api/admin');
      
      // エラーハンドリング（エラー時のみ）
      case 'errorHandler':
        return import('@/lib/api/error/handler');
      
      // 最適化モジュール（開発環境のみ）
      case 'optimization':
        if (process.env.NODE_ENV === 'development') {
          return Promise.all([
            import('./interceptor-optimizer'),
            import('./cache-strategy'),
          ]);
        }
        return null;
      
      default:
        throw new Error(`Unknown module: ${moduleName}`);
    }
  }
  
  /**
   * 複数のモジュールを並列ロード
   */
  async loadMultipleModules(moduleNames: string[]): Promise<any[]> {
    const promises = moduleNames.map(name => this.loadApiModule(name));
    return Promise.all(promises);
  }
  
  /**
   * モジュールをプリロード（バックグラウンド）
   */
  preloadModule(moduleName: string): void {
    // requestIdleCallback を使用してアイドル時にロード
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        this.loadApiModule(moduleName).catch(console.error);
      });
    } else {
      // フォールバック：setTimeout使用
      setTimeout(() => {
        this.loadApiModule(moduleName).catch(console.error);
      }, 100);
    }
  }
  
  /**
   * ロード済みモジュールをアンロード（メモリ解放）
   */
  unloadModule(moduleName: string): void {
    this.loadedModules.delete(moduleName);
  }
  
  /**
   * すべてのモジュールをクリア
   */
  clearAll(): void {
    this.loadedModules.clear();
    this.loadingPromises.clear();
  }
}

/**
 * APIエクスポートの最適化
 * Tree-shaking を改善するための軽量エクスポート
 */
export const createLightweightApi = () => {
  // 最小限のAPIのみエクスポート
  return {
    // 基本機能のみ
    async getClient() {
      const { apiClient } = await import('@/lib/api/index');
      return apiClient;
    },
    
    // エラーハンドリング（必要時のみ）
    async handleError(error: any) {
      const { handleApiError } = await import('@/lib/api/error/handler');
      return handleApiError(error);
    },
    
    // プリセットクライアント（必要時のみ）
    async createPresetClient(preset: string) {
      const { createPresetApiClient } = await import('@/lib/api/factory');
      return createPresetApiClient(preset as any);
    },
  };
};

/**
 * コード分割の境界定義
 * 各機能を独立したチャンクに分割
 */
export const apiChunks = {
  // コアチャンク（必須）
  core: () => import(/* webpackChunkName: "api-core" */ '@/lib/api/index'),
  
  // 認証チャンク
  auth: () => import(/* webpackChunkName: "api-auth" */ '@/lib/api/auth'),
  
  // ユーザー管理チャンク
  user: () => import(/* webpackChunkName: "api-user" */ '@/lib/api/user'),
  
  // 経費チャンク
  expense: () => import(/* webpackChunkName: "api-expense" */ '@/lib/api/expense'),
  
  // 週報チャンク
  weeklyReport: () => import(/* webpackChunkName: "api-weekly" */ '@/lib/api/weeklyReport'),
  
  // エラーチャンク
  error: () => import(/* webpackChunkName: "api-error" */ '@/lib/api/error/handler'),
  
  // 型定義チャンク（TypeScriptのみ）
  types: () => import(/* webpackChunkName: "api-types" */ '@/lib/api/types/unified'),
};

/**
 * バンドル分析用メタデータ
 */
export const bundleMetadata = {
  // 各モジュールの推定サイズ
  moduleSizes: {
    core: '15KB',
    auth: '8KB',
    user: '6KB',
    expense: '10KB',
    weeklyReport: '12KB',
    skillSheet: '9KB',
    admin: '7KB',
    error: '5KB',
    optimization: '20KB',
  },
  
  // 依存関係
  dependencies: {
    core: ['axios'],
    auth: ['core'],
    user: ['core', 'auth'],
    expense: ['core', 'auth'],
    weeklyReport: ['core', 'auth'],
    skillSheet: ['core', 'auth'],
    admin: ['core', 'auth', 'user'],
    error: ['core'],
    optimization: ['core'],
  },
  
  // 推奨ロード順序
  recommendedLoadOrder: [
    'core',
    'auth',
    'error',
    // その他は必要に応じて
  ],
};

/**
 * Next.js用の最適化設定
 */
export const nextjsOptimization = {
  // webpack設定の拡張
  webpack: (config: any) => {
    // Tree-shaking の強化
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
      
      // チャンク分割の設定
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // APIコアをまとめる
          apiCore: {
            test: /[\\/]lib[\\/]api[\\/]/,
            name: 'api-core',
            priority: 10,
            reuseExistingChunk: true,
          },
          
          // ベンダー（axios等）を分離
          vendor: {
            test: /[\\/]node_modules[\\/](axios|qs)/,
            name: 'api-vendor',
            priority: 20,
          },
        },
      },
    };
    
    return config;
  },
  
  // 環境変数による最適化
  env: {
    // 開発環境でのみデバッグ機能を有効化
    ENABLE_API_DEBUG: process.env.NODE_ENV === 'development',
    
    // 本番環境でのみ圧縮を有効化
    ENABLE_API_COMPRESSION: process.env.NODE_ENV === 'production',
  },
};

/**
 * バンドルサイズ監視
 */
export class BundleSizeMonitor {
  private sizeThresholds = {
    warning: 100 * 1024,  // 100KB
    error: 200 * 1024,    // 200KB
  };
  
  /**
   * バンドルサイズをチェック
   */
  checkBundleSize(stats: any): void {
    const assets = stats.assets || [];
    
    assets.forEach((asset: any) => {
      if (asset.name.includes('api')) {
        const sizeInBytes = asset.size;
        
        if (sizeInBytes > this.sizeThresholds.error) {
          console.error(
            `❌ API bundle ${asset.name} is too large: ${(sizeInBytes / 1024).toFixed(2)}KB`
          );
        } else if (sizeInBytes > this.sizeThresholds.warning) {
          console.warn(
            `⚠️ API bundle ${asset.name} is getting large: ${(sizeInBytes / 1024).toFixed(2)}KB`
          );
        }
      }
    });
  }
  
  /**
   * 推奨事項を生成
   */
  generateRecommendations(stats: any): string[] {
    const recommendations: string[] = [];
    const modules = stats.modules || [];
    
    // 大きなモジュールを検出
    const largeModules = modules.filter((m: any) => m.size > 10000);
    if (largeModules.length > 0) {
      recommendations.push(
        `Consider splitting large modules: ${largeModules.map((m: any) => m.name).join(', ')}`
      );
    }
    
    // 重複を検出
    const duplicates = this.findDuplicates(modules);
    if (duplicates.length > 0) {
      recommendations.push(
        `Remove duplicate imports: ${duplicates.join(', ')}`
      );
    }
    
    return recommendations;
  }
  
  /**
   * 重複モジュールを検出
   */
  private findDuplicates(modules: any[]): string[] {
    const seen = new Map<string, number>();
    const duplicates: string[] = [];
    
    modules.forEach((m: any) => {
      const count = seen.get(m.name) || 0;
      seen.set(m.name, count + 1);
      
      if (count === 1) {
        duplicates.push(m.name);
      }
    });
    
    return duplicates;
  }
}

// シングルトンインスタンス
export const dynamicApiLoader = new DynamicApiLoader();
export const bundleSizeMonitor = new BundleSizeMonitor();

// デフォルトエクスポート
export default {
  dynamicApiLoader,
  bundleSizeMonitor,
  createLightweightApi,
  apiChunks,
  bundleMetadata,
  nextjsOptimization,
};