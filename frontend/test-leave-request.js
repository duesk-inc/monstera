#!/usr/bin/env node

/**
 * 休暇申請機能のテストスクリプト
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/v1';

// テスト用データ
const testLeaveRequest = {
  leave_type: 'annual',
  start_date: '2025-01-20',
  end_date: '2025-01-21',
  reason: '私用のため',
  is_half_day: false,
  half_day_type: null,
  contact_during_leave: '090-0000-0000'
};

async function testLeaveRequestSubmit() {
  console.log('====================================');
  console.log('休暇申請機能テスト');
  console.log('====================================\n');
  
  try {
    console.log('1. 休暇申請API呼び出し:');
    console.log('-------------------');
    console.log('リクエストURL:', `${API_BASE_URL}/leave-requests`);
    console.log('リクエストデータ:', JSON.stringify(testLeaveRequest, null, 2));
    
    const response = await axios.post(
      `${API_BASE_URL}/leave-requests`,
      testLeaveRequest,
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
      console.log('✅ 休暇申請成功');
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
testLeaveRequestSubmit();