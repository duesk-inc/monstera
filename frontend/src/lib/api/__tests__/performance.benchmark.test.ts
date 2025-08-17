/**
 * APIパフォーマンステストとベンチマーク
 */

import { performance } from 'perf_hooks';
import { 
  createPresetApiClient,
  unifiedApiFactory,
  clearApiCache,
} from '@/lib/api/factory';
import { interceptorOptimizer } from '@/lib/api/optimization/interceptor-optimizer';
import { advancedCacheStrategy } from '@/lib/api/optimization/cache-strategy';
import { dynamicApiLoader, bundleSizeMonitor } from '@/lib/api/optimization/bundle-optimizer';
import axios, { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';

// パフォーマンス測定ユーティリティ
class PerformanceMeasurer {
  private measurements: Map<string, number[]> = new Map();

  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);
    
    return result;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);
    
    return result;
  }

  getStats(name: string) {
    const measurements = this.measurements.get(name) || [];
    if (measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sum / sorted.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      count: sorted.length,
    };
  }

  clear() {
    this.measurements.clear();
  }
}

// テスト用のモックとセットアップ
let mockAxios: MockAdapter;
const measurer = new PerformanceMeasurer();

beforeEach(() => {
  clearApiCache();
  advancedCacheStrategy.clear();
  interceptorOptimizer.resetStats();
  measurer.clear();
});

afterEach(() => {
  if (mockAxios) {
    mockAxios.restore();
  }
});

describe('APIクライアント作成のパフォーマンス', () => {
  it('クライアント作成時間を測定する', () => {
    const iterations = 100;
    
    // キャッシュなしの作成時間
    for (let i = 0; i < iterations; i++) {
      measurer.measure('create-no-cache', () => {
        unifiedApiFactory.createCustomClient({
          useCache: false,
        });
      });
    }
    
    // キャッシュありの作成時間
    for (let i = 0; i < iterations; i++) {
      measurer.measure('create-with-cache', () => {
        createPresetApiClient('default');
      });
    }
    
    const noCacheStats = measurer.getStats('create-no-cache');
    const withCacheStats = measurer.getStats('create-with-cache');
    
    console.log('クライアント作成パフォーマンス:');
    console.log('キャッシュなし:', noCacheStats);
    console.log('キャッシュあり:', withCacheStats);
    
    // キャッシュありの方が高速であることを確認
    expect(withCacheStats!.mean).toBeLessThan(noCacheStats!.mean);
    // 95パーセンタイルが10ms以下であることを確認
    expect(withCacheStats!.p95).toBeLessThan(10);
  });

  it('プリセット別の作成時間を比較する', () => {
    const presets: Array<'default' | 'auth' | 'admin' | 'public' | 'upload' | 'batch' | 'realtime'> = 
      ['default', 'auth', 'admin', 'public', 'upload', 'batch', 'realtime'];
    const iterations = 50;
    
    presets.forEach(preset => {
      for (let i = 0; i < iterations; i++) {
        measurer.measure(`preset-${preset}`, () => {
          createPresetApiClient(preset);
        });
      }
    });
    
    console.log('プリセット別作成時間:');
    presets.forEach(preset => {
      const stats = measurer.getStats(`preset-${preset}`);
      console.log(`${preset}:`, stats);
      
      // すべてのプリセットで平均作成時間が5ms以下
      expect(stats!.mean).toBeLessThan(5);
    });
  });
});

describe('インターセプター最適化のパフォーマンス', () => {
  it('インターセプター実行順序の最適化効果を測定する', async () => {
    const client = createPresetApiClient('default');
    mockAxios = new MockAdapter(client);
    
    // モックレスポンスを設定
    mockAxios.onGet('/test').reply(200, { data: 'test' });
    
    const iterations = 100;
    
    // 最適化なしのリクエスト
    for (let i = 0; i < iterations; i++) {
      await measurer.measureAsync('request-unoptimized', async () => {
        await client.get('/test');
      });
    }
    
    // インターセプター順序を最適化
    interceptorOptimizer.optimizeExecutionOrder(['logging', 'auth', 'error', 'retry']);
    
    // 最適化ありのリクエスト
    for (let i = 0; i < iterations; i++) {
      await measurer.measureAsync('request-optimized', async () => {
        await client.get('/test');
      });
    }
    
    const unoptimizedStats = measurer.getStats('request-unoptimized');
    const optimizedStats = measurer.getStats('request-optimized');
    
    console.log('インターセプター最適化効果:');
    console.log('最適化なし:', unoptimizedStats);
    console.log('最適化あり:', optimizedStats);
    
    // 最適化により処理時間が改善されることを確認
    expect(optimizedStats!.mean).toBeLessThanOrEqual(unoptimizedStats!.mean);
  });

  it('条件付き実行によるパフォーマンス改善を測定する', async () => {
    const client = createPresetApiClient('default');
    mockAxios = new MockAdapter(client);
    
    mockAxios.onGet('/health').reply(200, { status: 'ok' });
    mockAxios.onGet('/api/data').reply(200, { data: 'test' });
    
    const iterations = 50;
    
    // ヘルスチェックエンドポイント（最適化される）
    for (let i = 0; i < iterations; i++) {
      await measurer.measureAsync('health-check', async () => {
        await client.get('/health');
      });
    }
    
    // 通常のAPIエンドポイント
    for (let i = 0; i < iterations; i++) {
      await measurer.measureAsync('api-request', async () => {
        await client.get('/api/data');
      });
    }
    
    const healthStats = measurer.getStats('health-check');
    const apiStats = measurer.getStats('api-request');
    
    console.log('条件付き実行パフォーマンス:');
    console.log('ヘルスチェック:', healthStats);
    console.log('通常API:', apiStats);
    
    // ヘルスチェックの方が高速であることを確認
    expect(healthStats!.mean).toBeLessThan(apiStats!.mean);
  });
});

describe('キャッシュ戦略のパフォーマンス', () => {
  it('キャッシュヒット率と応答時間の関係を測定する', () => {
    const iterations = 1000;
    const cacheKeys = ['key1', 'key2', 'key3', 'key4', 'key5'];
    
    // ランダムアクセスパターンでキャッシュを使用
    for (let i = 0; i < iterations; i++) {
      const key = cacheKeys[Math.floor(Math.random() * cacheKeys.length)];
      
      measurer.measure('cache-access', () => {
        let client = advancedCacheStrategy.get(key);
        if (!client) {
          client = axios.create();
          advancedCacheStrategy.set(key, client);
        }
      });
    }
    
    const cacheStats = advancedCacheStrategy.getStatistics();
    const accessStats = measurer.getStats('cache-access');
    
    console.log('キャッシュパフォーマンス:');
    console.log('キャッシュ統計:', cacheStats);
    console.log('アクセス時間:', accessStats);
    
    // 高いヒット率を確認
    expect(cacheStats.hitRate).toBeGreaterThan(0.7);
    // 平均アクセス時間が1ms以下
    expect(accessStats!.mean).toBeLessThan(1);
  });

  it('動的サイズ調整の効果を測定する', () => {
    const iterations = 500;
    
    // 初期状態でのアクセス
    for (let i = 0; i < 100; i++) {
      const key = `initial-${i}`;
      measurer.measure('initial-phase', () => {
        advancedCacheStrategy.set(key, axios.create());
      });
    }
    
    // ヒット率が高い場合のアクセス
    for (let i = 0; i < 200; i++) {
      const key = `high-hit-${i % 10}`; // 10個のキーを繰り返し
      measurer.measure('high-hit-phase', () => {
        let client = advancedCacheStrategy.get(key);
        if (!client) {
          client = axios.create();
          advancedCacheStrategy.set(key, client);
        }
      });
    }
    
    // ヒット率が低い場合のアクセス
    for (let i = 0; i < 200; i++) {
      const key = `low-hit-${i}`; // すべて異なるキー
      measurer.measure('low-hit-phase', () => {
        advancedCacheStrategy.set(key, axios.create());
      });
    }
    
    const initialStats = measurer.getStats('initial-phase');
    const highHitStats = measurer.getStats('high-hit-phase');
    const lowHitStats = measurer.getStats('low-hit-phase');
    
    console.log('動的サイズ調整効果:');
    console.log('初期フェーズ:', initialStats);
    console.log('高ヒット率フェーズ:', highHitStats);
    console.log('低ヒット率フェーズ:', lowHitStats);
    
    // 高ヒット率フェーズが最も高速
    expect(highHitStats!.mean).toBeLessThan(initialStats!.mean);
    expect(highHitStats!.mean).toBeLessThan(lowHitStats!.mean);
  });
});

describe('バンドルサイズ最適化のパフォーマンス', () => {
  it('動的インポートの遅延時間を測定する', async () => {
    const modules = ['auth', 'user', 'expense', 'weeklyReport'];
    
    for (const module of modules) {
      await measurer.measureAsync(`load-${module}`, async () => {
        await dynamicApiLoader.loadApiModule(module);
      });
    }
    
    // 2回目のロード（キャッシュから）
    for (const module of modules) {
      await measurer.measureAsync(`cached-load-${module}`, async () => {
        await dynamicApiLoader.loadApiModule(module);
      });
    }
    
    console.log('動的インポートパフォーマンス:');
    modules.forEach(module => {
      const initialStats = measurer.getStats(`load-${module}`);
      const cachedStats = measurer.getStats(`cached-load-${module}`);
      console.log(`${module} (初回):`, initialStats);
      console.log(`${module} (キャッシュ):`, cachedStats);
      
      // キャッシュからのロードが高速
      if (cachedStats && initialStats) {
        expect(cachedStats.mean).toBeLessThan(initialStats.mean);
      }
    });
  });

  it('並列モジュールロードのパフォーマンスを測定する', async () => {
    const modules = ['auth', 'user', 'expense'];
    
    // 逐次ロード
    const sequentialStart = performance.now();
    for (const module of modules) {
      await dynamicApiLoader.loadApiModule(module);
    }
    const sequentialTime = performance.now() - sequentialStart;
    
    // キャッシュをクリア
    dynamicApiLoader.clearAll();
    
    // 並列ロード
    const parallelStart = performance.now();
    await dynamicApiLoader.loadMultipleModules(modules);
    const parallelTime = performance.now() - parallelStart;
    
    console.log('モジュールロード方式比較:');
    console.log(`逐次ロード: ${sequentialTime.toFixed(2)}ms`);
    console.log(`並列ロード: ${parallelTime.toFixed(2)}ms`);
    console.log(`改善率: ${((1 - parallelTime / sequentialTime) * 100).toFixed(1)}%`);
    
    // 並列ロードが高速
    expect(parallelTime).toBeLessThan(sequentialTime);
  });
});

describe('総合パフォーマンスベンチマーク', () => {
  it('エンドツーエンドのAPIコールパフォーマンスを測定する', async () => {
    const scenarios = [
      { name: '単純GET', method: 'get', url: '/api/simple' },
      { name: '認証付きGET', method: 'get', url: '/api/auth/profile' },
      { name: 'POSTリクエスト', method: 'post', url: '/api/data', data: { test: 'data' } },
      { name: '大量データGET', method: 'get', url: '/api/large-data' },
    ];
    
    for (const scenario of scenarios) {
      const client = createPresetApiClient('default');
      const mock = new MockAdapter(client);
      
      // モックレスポンスを設定
      if (scenario.method === 'get') {
        const responseData = scenario.name === '大量データGET' 
          ? { data: new Array(1000).fill({ id: 1, name: 'test' }) }
          : { data: 'test' };
        mock.onGet(scenario.url).reply(200, responseData);
      } else {
        mock.onPost(scenario.url).reply(201, { id: 1, ...scenario.data });
      }
      
      // パフォーマンス測定
      const iterations = 50;
      for (let i = 0; i < iterations; i++) {
        await measurer.measureAsync(scenario.name, async () => {
          if (scenario.method === 'get') {
            await client.get(scenario.url);
          } else {
            await client.post(scenario.url, scenario.data);
          }
        });
      }
      
      mock.restore();
    }
    
    console.log('エンドツーエンドパフォーマンス:');
    scenarios.forEach(scenario => {
      const stats = measurer.getStats(scenario.name);
      console.log(`${scenario.name}:`, stats);
      
      // 基本的なレスポンスは10ms以下
      if (scenario.name !== '大量データGET') {
        expect(stats!.p95).toBeLessThan(10);
      }
    });
  });

  it('同時並行リクエストのスケーラビリティを測定する', async () => {
    const client = createPresetApiClient('default');
    mockAxios = new MockAdapter(client);
    
    // 複数のエンドポイントをモック
    for (let i = 0; i < 10; i++) {
      mockAxios.onGet(`/api/endpoint${i}`).reply(200, { id: i });
    }
    
    const concurrencyLevels = [1, 5, 10, 20];
    
    for (const concurrency of concurrencyLevels) {
      const start = performance.now();
      
      const promises = [];
      for (let i = 0; i < concurrency; i++) {
        promises.push(client.get(`/api/endpoint${i % 10}`));
      }
      
      await Promise.all(promises);
      const duration = performance.now() - start;
      
      console.log(`並行度 ${concurrency}: ${duration.toFixed(2)}ms`);
      
      // リニアにスケールすることを確認
      const expectedMaxTime = 50 * Math.log2(concurrency + 1);
      expect(duration).toBeLessThan(expectedMaxTime);
    }
  });

  it('メモリ使用量の効率性を検証する', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // 大量のクライアントを作成
    const clients: AxiosInstance[] = [];
    for (let i = 0; i < 100; i++) {
      clients.push(createPresetApiClient('default'));
    }
    
    const afterCreationMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (afterCreationMemory - initialMemory) / 1024 / 1024; // MB
    
    console.log(`100クライアント作成後のメモリ増加: ${memoryIncrease.toFixed(2)}MB`);
    
    // メモリ増加が妥当な範囲内（10MB以下）
    expect(memoryIncrease).toBeLessThan(10);
    
    // キャッシュクリア後のメモリ解放を確認
    clearApiCache();
    if (global.gc) {
      global.gc(); // 手動GC（--expose-gcオプションが必要）
    }
    
    const afterClearMemory = process.memoryUsage().heapUsed;
    const memoryReleased = (afterCreationMemory - afterClearMemory) / 1024 / 1024;
    
    console.log(`キャッシュクリア後のメモリ解放: ${memoryReleased.toFixed(2)}MB`);
  });
});

describe('パフォーマンス最適化レポート', () => {
  it('最適化の総合効果を測定して報告する', async () => {
    console.log('\n========================================');
    console.log('APIパフォーマンス最適化 総合レポート');
    console.log('========================================\n');
    
    // インターセプター最適化レポート
    const optimizationReport = interceptorOptimizer.generateOptimizationReport();
    console.log(optimizationReport);
    console.log();
    
    // キャッシュメトリクス
    const cacheMetrics = advancedCacheStrategy.exportMetrics();
    console.log('キャッシュメトリクス:');
    console.log(JSON.stringify(cacheMetrics, null, 2));
    console.log();
    
    // バンドルサイズ監視
    const bundleStats = {
      assets: [
        { name: 'api-core.js', size: 15 * 1024 },
        { name: 'api-auth.js', size: 8 * 1024 },
        { name: 'api-vendor.js', size: 30 * 1024 },
      ],
    };
    
    console.log('バンドルサイズ分析:');
    bundleSizeMonitor.checkBundleSize(bundleStats);
    const recommendations = bundleSizeMonitor.generateRecommendations(bundleStats);
    recommendations.forEach(rec => console.log(`- ${rec}`));
    
    console.log('\n========================================\n');
  });
});