#!/usr/bin/env node

/**
 * 週報提出機能のテストスクリプト
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/v1';

// テスト用データ
const testWeeklyReport = {
  week_starting: '2025-01-13',
  project_updates: 'APIクライアントアーキテクチャの改善を実施',
  achievements: 'Phase 1-4の実装完了',
  challenges: '特になし',
  next_week_plan: 'テストとデプロイ',
  hours_worked: 40,
  overtime_hours: 0
};

async function testWeeklyReportSubmit() {
  console.log('====================================');
  console.log('週報提出機能テスト');
  console.log('====================================\n');
  
  try {
    console.log('1. 週報作成API呼び出し:');
    console.log('-------------------');
    console.log('リクエストURL:', `${API_BASE_URL}/weekly-reports`);
    console.log('リクエストデータ:', JSON.stringify(testWeeklyReport, null, 2));
    
    const response = await axios.post(
      `${API_BASE_URL}/weekly-reports`,
      testWeeklyReport,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
        validateStatus: () => true // 全てのステータスコードを受け入れる
      }
    );
    
    console.log('\nレスポンスステータス:', response.status);
    console.log('レスポンスヘッダー:', response.headers);
    
    if (response.status === 200 || response.status === 201) {
      console.log('✅ 週報作成成功');
      console.log('レスポンスデータ:', JSON.stringify(response.data, null, 2));
    } else if (response.status === 401) {
      console.log('⚠️ 認証が必要です（期待される動作）');
      console.log('レスポンス:', response.data);
    } else if (response.status === 404) {
      console.log('❌ エンドポイントが見つかりません');
      console.log('APIクライアントの設定を確認してください');
    } else {
      console.log('❌ 予期しないエラー');
      console.log('レスポンス:', response.data);
    }
    
  } catch (error) {
    console.error('❌ リクエストエラー:', error.message);
    if (error.response) {
      console.error('エラーレスポンス:', error.response.data);
    }
  }
  
  console.log('\n====================================');
  console.log('テスト完了');
  console.log('====================================\n');
}

// テスト実行
testWeeklyReportSubmit();