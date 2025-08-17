#!/usr/bin/env node

/**
 * 経費申請機能のテストスクリプト
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/v1';

// テスト用データ
const testExpense = {
  expense_date: '2025-01-15',
  category: 'transportation',
  amount: 1500,
  description: '客先訪問の交通費',
  receipt_url: null,
  project_id: null
};

async function testExpenseSubmit() {
  console.log('====================================');
  console.log('経費申請機能テスト');
  console.log('====================================\n');
  
  try {
    console.log('1. 経費申請API呼び出し:');
    console.log('-------------------');
    console.log('リクエストURL:', `${API_BASE_URL}/expenses`);
    console.log('リクエストデータ:', JSON.stringify(testExpense, null, 2));
    
    const response = await axios.post(
      `${API_BASE_URL}/expenses`,
      testExpense,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
        validateStatus: () => true
      }
    );
    
    console.log('\nレスポンスステータス:', response.status);
    
    if (response.status === 200 || response.status === 201) {
      console.log('✅ 経費申請成功');
      console.log('レスポンスデータ:', JSON.stringify(response.data, null, 2));
    } else if (response.status === 401) {
      console.log('⚠️ 認証が必要です（期待される動作）');
      console.log('レスポンス:', response.data);
    } else if (response.status === 404) {
      console.log('❌ エンドポイントが見つかりません');
    } else {
      console.log('❌ 予期しないエラー');
      console.log('レスポンス:', response.data);
    }
    
  } catch (error) {
    console.error('❌ リクエストエラー:', error.message);
  }
  
  console.log('\n====================================');
  console.log('テスト完了');
  console.log('====================================\n');
}

// テスト実行
testExpenseSubmit();